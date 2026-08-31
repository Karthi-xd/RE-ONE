import sys
import ollama
from pathlib import Path
import chromadb

YEAR = sys.argv[1]

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "data" / "chroma_db"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_or_create_collection(name=f"events_{YEAR}")


def retrieve(query, n_results=3):
    results = collection.query(query_texts=[query], n_results=n_results)
    return results["documents"][0]


def build_prompt(query, chunks):
    context = "\n\n".join(chunks)
    return f"""You are answering questions using ONLY the context below, which is from the year {YEAR}.
If the answer is not contained in the context, say "I don't know."
Do not use any knowledge from outside this context.

Context:
{context}

Question: {query}

Answer:"""


def main():
    query = input(f"Ask something about {YEAR}: ")
    chunks = retrieve(query)
    prompt = build_prompt(query, chunks)

    response = ollama.chat(model="qwen2.5:7b", messages=[{"role": "user", "content": prompt}])
    print("\n--- ANSWER ---")
    print(response["message"]["content"])


if __name__ == "__main__":
    main()