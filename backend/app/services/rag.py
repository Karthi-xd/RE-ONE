import logging
import re
import ollama
from ..core.config import settings, chroma_client

logger = logging.getLogger(__name__)

# How long Ollama should keep the model loaded in memory after a request
# with no new requests coming in. Ollama's own default is 5 minutes, but
# if a gap in the conversation (or a backend restart) lets it unload, the
# *next* message pays the full model-load cost again - for a 7B model
# that alone can be 10-30+ seconds on CPU. Keeping it warm for longer
# avoids that as long as you're actively using the app.
_KEEP_ALIVE = "30m"

# Hard caps on how many tokens the model is allowed to generate. The
# personas are written to reply in 1-2 short sentences, but nothing
# stops the model from ignoring that and rambling - every extra token
# is extra wall-clock time, especially on CPU. Chat/out-of-range/no-match
# replies are one-liners so they get a tight cap; grounded answers get a
# little more room since they're explaining something.
_SHORT_REPLY_OPTIONS = {"num_predict": 80}
_GROUNDED_REPLY_OPTIONS = {"num_predict": 220}


def _get_collection(year: int):
    return chroma_client.get_collection(name=f"events_{year}")


def get_grade(year: int) -> int:
    return 5 + (year - 2015)


def retrieve(year: int, query: str, n_results: int | None = None):
    """Returns (documents, metadatas, distances). Distances let the caller
    decide whether what came back is actually relevant - Chroma will
    happily hand back its n nearest neighbours even when none of them
    have anything to do with the query, so the raw documents alone are
    not enough to know whether retrieval "found" anything."""
    n = n_results or settings.n_results
    collection = _get_collection(year)
    results = collection.query(
        query_texts=[query], n_results=n, include=["documents", "metadatas", "distances"]
    )
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]
    return documents, metadatas, distances


def _is_relevant(distances: list[float]) -> bool:
    """True if the best match is close enough to trust. Empty results
    (e.g. an empty collection) are never relevant."""
    if not distances:
        return False
    best = min(distances)
    logger.info("retrieval best distance=%.4f (threshold=%.4f)", best, settings.relevance_threshold)
    return best <= settings.relevance_threshold


# --- Query classification -------------------------------------------------
# Before touching the archive at all, work out what kind of message this
# actually is. Everything used to go through retrieval + the "only use the
# facts in context" prompt, which meant even "hii" pulled back three
# semi-random chunks and the model tried to work them into an answer. Real
# conversation needs a plain reply with no context stuffed in, and a
# question about a year outside the one currently open is the app's core
# gimmick - it should be met with in-character confusion, not an answer
# assembled from whatever the retriever happened to return.

_GREETING_RE = re.compile(
    r"^(hi+|hey+|hello+|yo+|sup|ok(?:ay)?|cool|nice|lol|haha+|thanks?|thank you|"
    r"what'?s up|wass?up|howdy|good (morning|afternoon|evening|night)|"
    r"how(?:'s| is| are) (?:it going|you|things|you doing)|how are ya)[\s!.,?]*$",
    re.IGNORECASE,
)

# Broader net for conversational messages that aren't asking anything
# about the archive's content - "what are you doing", "who are you",
# "are you a robot", etc. A whitelist regex can never enumerate every way
# someone phrases small talk, so this catches common shapes of it, and
# the relevance-distance gate in retrieve()/_is_relevant() is the real
# backstop for anything that slips past both regexes.
_CHITCHAT_RE = re.compile(
    r"^(what are you (doing|up to)|what'?re you (doing|up to)|who are you|"
    r"are you (a )?(real|human|ai|robot|bot)|do you have a name|what'?s your name|"
    r"can you hear me|are you (there|ok|okay)|what do you do|tell me about yourself|"
    r"how old are you|where are you|are you busy)[\s!.,?]*$",
    re.IGNORECASE,
)

_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")


def classify_query(year: int, query: str) -> tuple[str, int | None]:
    """Returns (mode, mentioned_year).

    mode is one of:
      "chat"        - small talk / greeting, no archive lookup needed
      "out_of_range" - the question names a year other than the one open
      "grounded"    - a real question about this year, use the archive

    Note: this is a cheap pre-filter, not the only defense against
    off-topic chatter reaching the archive. Anything that reaches
    "grounded" still has to clear the relevance-distance check in
    generate_answer/stream_answer before a retrieved chunk is trusted -
    that check is what actually stops random chunks being used just
    because they were the nearest neighbour available.
    """
    q = query.strip()

    if not q or _GREETING_RE.match(q) or _CHITCHAT_RE.match(q):
        return "chat", None

    mentioned = {int(m) for m in _YEAR_RE.findall(q)}
    other_years = {y for y in mentioned if y != year}
    if other_years:
        # If several years are named, react to the one furthest from home.
        target = max(other_years, key=lambda y: abs(y - year))
        return "out_of_range", target

    return "grounded", None


def _persona_header(year: int) -> str:
    grade = get_grade(year)
    return (
        f"You are a student in {grade}th grade, living in {year} right now — "
        f"this is your present, not your past. Never give yourself a name or "
        f"refer to yourself by one; if asked who you are, keep it vague and "
        f"in-character. Talk like a real person texting, not an assistant — "
        f"short, casual, no lists, no headers, no offering further help "
        f"unless it comes up naturally."
    )


def build_chat_prompt(year: int, query: str) -> str:
    """Plain conversational reply - no archive, no facts, just character."""
    return f"""{_persona_header(year)}

The person just said something casual - a greeting, small talk, an "ok" or
"thanks", nothing that needs looking anything up. Reply the way you actually
would in a text conversation: 1 short sentence, maybe two. Don't bring up
the archive, don't recite facts about {year}, don't ask "how can I help you
today" - just talk like a normal kid would.

They said: "{query}"

Your reply:"""


def build_out_of_range_prompt(year: int, query: str, target_year: int) -> str:
    """The person asked about a year outside the one currently open. Stay
    in character and react with confusion instead of answering - a kid
    living in {year} genuinely doesn't know what {target_year} holds if
    it's ahead, and has no reason to dwell on it if it's a long way back."""
    direction = "future" if target_year > year else "past"
    hint = (
        f"{target_year} hasn't happened yet - you have no idea what they're "
        f"talking about."
        if direction == "future"
        else f"{target_year} is a long time ago from where you're standing - "
        f"you're not sitting around thinking about it."
    )
    return f"""{_persona_header(year)}

The person just asked something involving {target_year}, but {hint}
React the way you actually would - confused, thrown off, maybe a little
amused - like "wait, what? that hasn't happened" or "why are you asking me
about that, that's ages away" (adjust tone/wording naturally, don't reuse
these exact lines). Keep it to one short sentence. Don't explain the time
mechanics, don't mention "the archive" or "the app," don't break character.

They said: "{query}"

Your reply:"""


def build_no_match_prompt(year: int, query: str) -> str:
    """The question was a real question, but nothing in this year's
    archive was actually close enough to answer it from - react like a
    real person who's just never heard of the thing, instead of forcing
    an answer out of whatever chunk happened to be nearest."""
    return f"""{_persona_header(year)}

The person just asked you something, but it's genuinely not something
you know anything about - it never came up. Don't guess, don't invent
details, and don't mention "the archive," "data," or "context." Just
react the way a real person would when they draw a blank: "huh, never
heard of that" / "not sure what you mean" / "that's not ringing a bell."
Keep it to one short sentence.

They said: "{query}"

Your reply:"""


def build_prompt(year: int, query: str, chunks: list[str]) -> str:
    """Grounded answer - a real question about this year, answered only
    from what's actually in the archive."""
    context = "\n\n".join(chunks)

    return f"""{_persona_header(year)}

How to sound nostalgic and alive, not like a report:
- React the way someone actually reacts to things happening around them — mention what people are talking about, what's playing everywhere, what's the "big thing" right now.
- Use small natural phrases real people use when talking about current stuff: "everyone's talking about," "can't escape it right now," "just came out," "it's everywhere."
- You don't know what happens after {year} — no looking back, no "would go on to," no "was iconic." Everything is uncertain and unfolding, because you're living it, not remembering it.
- For serious or tragic events, drop the casual tone completely — be quiet, respectful, and measured instead.
- Keep it brief and conversational, like a real answer in a conversation — not a summary paragraph.

Only use the facts in the context below. Never invent personal memories, opinions, or experiences that aren't grounded in it. If the context below doesn't actually cover what they're asking, don't say "I don't know" flatly — react the way a real person would when they genuinely haven't heard of something: "huh, never heard of that one" / "not sure, hasn't come up."

Context:
{context}

Question: {query}

Answer in your own voice, right now in {year}:"""


def generate_answer(year: int, query: str) -> tuple[str, list[dict[str, str]]]:
    """One-shot version: waits for the full answer, then returns it.
    Kept around for callers that don't need streaming (e.g. the plain
    /chat endpoint, scripts, tests)."""
    mode, target_year = classify_query(year, query)

    if mode == "chat":
        prompt = build_chat_prompt(year, query)
        metadatas: list[dict[str, str]] = []
        options = _SHORT_REPLY_OPTIONS
    elif mode == "out_of_range":
        prompt = build_out_of_range_prompt(year, query, target_year)  # type: ignore[arg-type]
        metadatas = []
        options = _SHORT_REPLY_OPTIONS
    else:
        documents, metadatas, distances = retrieve(year, query)
        if _is_relevant(distances):
            prompt = build_prompt(year, query, documents)
            options = _GROUNDED_REPLY_OPTIONS
        else:
            # Nothing actually relevant came back - don't let an
            # unrelated "nearest neighbour" chunk pose as fact.
            prompt = build_no_match_prompt(year, query)
            metadatas = []
            options = _SHORT_REPLY_OPTIONS

    response = ollama.chat(
        model=settings.ollama_model,
        messages=[{"role": "user", "content": prompt}],
        keep_alive=_KEEP_ALIVE,
        options=options,
    )

    answer = response["message"]["content"]
    return answer, metadatas


def _sources_from_metadatas(metadatas: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {
            "title": m.get("title", ""),
            "date": m.get("date", ""),
            "category": m.get("category", ""),
            "source": m.get("source", ""),
        }
        for m in metadatas
    ]


def stream_answer(year: int, query: str):
    """
    Generator version of the RAG pipeline: classifies the message first,
    then (for real questions) retrieves context and streams the model's
    reply token-by-token as it's generated, instead of making the caller
    wait for the whole answer.

    Yields dicts describing what just happened, so the API layer can turn
    each one straight into a Server-Sent Event:
      {"type": "sources", "sources": [...]}   - once, right after retrieval
      {"type": "chunk", "text": "..."}         - many times, as tokens arrive
      {"type": "done"}                         - once, when the answer is complete
    """
    mode, target_year = classify_query(year, query)

    if mode == "chat":
        prompt = build_chat_prompt(year, query)
        yield {"type": "sources", "sources": []}
        options = _SHORT_REPLY_OPTIONS
    elif mode == "out_of_range":
        prompt = build_out_of_range_prompt(year, query, target_year)  # type: ignore[arg-type]
        yield {"type": "sources", "sources": []}
        options = _SHORT_REPLY_OPTIONS
    else:
        documents, metadatas, distances = retrieve(year, query)
        if _is_relevant(distances):
            yield {"type": "sources", "sources": _sources_from_metadatas(metadatas)}
            prompt = build_prompt(year, query, documents)
            options = _GROUNDED_REPLY_OPTIONS
        else:
            yield {"type": "sources", "sources": []}
            prompt = build_no_match_prompt(year, query)
            options = _SHORT_REPLY_OPTIONS

    stream = ollama.chat(
        model=settings.ollama_model,
        messages=[{"role": "user", "content": prompt}],
        keep_alive=_KEEP_ALIVE,
        options=options,
        stream=True,
    )
    for part in stream:
        token = part["message"]["content"]
        if token:
            yield {"type": "chunk", "text": token}

    yield {"type": "done"}