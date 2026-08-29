import json
from pathlib import Path
import chromadb

BASE_DIR = Path(__file__).resolve().parents[3]
CHUNKS_PATH = BASE_DIR / "data" / "processed" / "2015_chunks.json"
DB_PATH = BASE_DIR / "data" / "chroma_db"


def main():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    client = chromadb.PersistentClient(path=str(DB_PATH))

    collection = client.get_or_create_collection(name="events_2015")

    ids = [chunk["id"] for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]

    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

    print(f"Stored {len(chunks)} chunks in ChromaDB.")
    print(f"Database saved at: {DB_PATH}")


if __name__ == "__main__":
    main()