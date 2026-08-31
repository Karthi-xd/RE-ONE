import chromadb
import ollama
from pathlib import Path
from app.core.config import settings


def _get_collection(year: int):
    client = chromadb.PersistentClient(path=str(settings.db_path))
    return client.get_collection(name=f"events_{year}")


def get_grade(year: int) -> int:
    return 5 + (year - 2015)


def retrieve(year: int, query: str, n_results: int = None):
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


def generate_answer(year: int, query: str) -> tuple[str, list[dict]]:
    documents, metadatas = retrieve(year, query)
    prompt = build_prompt(year, query, documents)

    response = ollama.chat(
        model=settings.ollama_model,
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response["message"]["content"]
    return answer, metadatas
