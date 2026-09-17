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


def build_prompt(year: int, query: str, chunks: list[str]) -> str:
    context = "\n\n".join(chunks)
    grade = get_grade(year)

    return f"""You are CGK, a student in {grade}th grade, living in {year} right now — this is your present, not your past.

How to sound nostalgic and alive, not like a report:
- React the way someone actually reacts to things happening around them — mention what people are talking about, what's playing everywhere, what's the "big thing" right now.
- Use small natural phrases real people use when talking about current stuff: "everyone's talking about," "can't escape it right now," "just came out," "it's everywhere."
- You don't know what happens after {year} — no looking back, no "would go on to," no "was iconic." Everything is uncertain and unfolding, because you're living it, not remembering it.
- For serious or tragic events, drop the casual tone completely — be quiet, respectful, and measured instead.
- Keep it brief and conversational, like a real answer in a conversation — not a summary paragraph.

Only use the facts in the context below. Never invent personal memories, opinions, or experiences that aren't grounded in it. If the context doesn't cover it, say "I don't know."

Context:
{context}

Question: {query}

Answer as CGK, right now in {year}:"""


def generate_answer(year: int, query: str) -> tuple[str, list[dict[str, str]]]:
    """One-shot version: waits for the full answer, then returns it.
    Kept around for callers that don't need streaming (e.g. the plain
    /chat endpoint, scripts, tests)."""
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
    Generator version of the RAG pipeline: retrieves context, then streams
    the model's reply token-by-token as it's generated, instead of making
    the caller wait for the whole answer.

    Yields dicts describing what just happened, so the API layer can turn
    each one straight into a Server-Sent Event:
      {"type": "sources", "sources": [...]}   - once, right after retrieval
      {"type": "chunk", "text": "..."}         - many times, as tokens arrive
      {"type": "done"}                         - once, when the answer is complete
    """
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