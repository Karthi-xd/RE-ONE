import re
import chromadb
import ollama
from ..core.config import settings


def _get_collection(year: int):
    client = chromadb.PersistentClient(path=str(settings.db_path))
    return client.get_collection(name=f"events_{year}")


def get_grade(year: int) -> int:
    return 5 + (year - 2015)


def retrieve(year: int, query: str, n_results: int | None = None):
    n = n_results or settings.n_results
    collection = _get_collection(year)
    results = collection.query(query_texts=[query], n_results=n)
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    return documents, metadatas


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

_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")


def classify_query(year: int, query: str) -> tuple[str, int | None]:
    """Returns (mode, mentioned_year).

    mode is one of:
      "chat"        - small talk / greeting, no archive lookup needed
      "out_of_range" - the question names a year other than the one open
      "grounded"    - a real question about this year, use the archive
    """
    q = query.strip()

    if not q or _GREETING_RE.match(q):
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
    elif mode == "out_of_range":
        prompt = build_out_of_range_prompt(year, query, target_year)  # type: ignore[arg-type]
        metadatas = []
    else:
        documents, metadatas = retrieve(year, query)
        prompt = build_prompt(year, query, documents)

    response = ollama.chat(
        model=settings.ollama_model,
        messages=[{"role": "user", "content": prompt}]
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
    elif mode == "out_of_range":
        prompt = build_out_of_range_prompt(year, query, target_year)  # type: ignore[arg-type]
        yield {"type": "sources", "sources": []}
    else:
        documents, metadatas = retrieve(year, query)
        yield {"type": "sources", "sources": _sources_from_metadatas(metadatas)}
        prompt = build_prompt(year, query, documents)

    stream = ollama.chat(
        model=settings.ollama_model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for part in stream:
        token = part["message"]["content"]
        if token:
            yield {"type": "chunk", "text": token}

    yield {"type": "done"}