import sys
import json
from pathlib import Path
import chromadb

YEAR = sys.argv[1]

BASE_DIR = Path(__file__).resolve().parents[3]
CHUNKS_PATH = BASE_DIR / "data" / "processed" / f"{YEAR}_chunks.json"
DB_PATH = BASE_DIR / "data" / "chroma_db"


def main():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    client = chromadb.PersistentClient(path=str(DB_PATH))
    collection = client.get_or_create_collection(name=f"events_{YEAR}")

    collection.add(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks]
    )

    print(f"Stored {len(chunks)} chunks in collection events_{YEAR}")


if __name__ == "__main__":
    main()