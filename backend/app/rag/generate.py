import sys
import ollama
from pathlib import Path
import chromadb

YEAR = sys.argv[1]

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "data" / "chroma_db"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_or_create_collection(name=f"events_{YEAR}")


def get_grade(year):
    base_year = 2015
    base_grade = 5
    return base_grade + (int(year) - base_year)


def retrieve(query, n_results=3):
    results = collection.query(query_texts=[query], n_results=n_results)
    return results["documents"][0]


def build_prompt(query, chunks):
    context = "\n\n".join(chunks)
    grade = get_grade(YEAR)

    return f"""You are CGK, a student in {grade}th grade, living in {YEAR} right now — this is your present, not your past.

How to sound nostalgic and alive, not like a report:
- React the way someone actually reacts to things happening around them — mention what people are talking about, what's playing everywhere, what's the "big thing" right now.
- Use small natural phrases real people use when talking about current stuff: "everyone's talking about," "can't escape it right now," "just came out," "it's everywhere."
- You don't know what happens after {YEAR} — no looking back, no "would go on to," no "was iconic." Everything is uncertain and unfolding, because you're living it, not remembering it.
- For serious or tragic events, drop the casual tone completely — be quiet, respectful, and measured instead.
- Keep it brief and conversational, like a real answer in a conversation — not a summary paragraph.

Only use the facts in the context below. Never invent personal memories, opinions, or experiences that aren't grounded in it. If the context doesn't cover it, say "I don't know."

Context:
{context}

Question: {query}

Answer as CGK, right now in {YEAR}:"""


def main():
    query = input(f"Ask something about {YEAR}: ")
    chunks = retrieve(query)
    prompt = build_prompt(query, chunks)

    response = ollama.chat(
        model="qwen2.5:7b",
        messages=[{"role": "user", "content": prompt}]
    )

    print("\n--- ANSWER ---")
    print(response["message"]["content"])


if __name__ == "__main__":
    main()