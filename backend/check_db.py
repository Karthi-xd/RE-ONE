"""
Check what's actually inside your ChromaDB.

Usage (from the backend/ folder):
    python check_db.py

Shows every collection, how many chunks it has, and a sample chunk
so you can confirm your PDFs were actually ingested.
"""

from pathlib import Path
import chromadb

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "chroma_db"

def main():
    if not DB_PATH.exists():
        print(f"No database found at {DB_PATH}")
        print("You need to run ingest.py -> chunk.py -> store.py for at least one year first.")
        return

    client = chromadb.PersistentClient(path=str(DB_PATH))
    collections = client.list_collections()

    if not collections:
        print(f"Database exists at {DB_PATH} but has no collections yet.")
        return

    print(f"Database: {DB_PATH}\n")
    for col in collections:
        collection = client.get_collection(name=col.name)
        count = collection.count()
        print(f"- {col.name}: {count} chunk(s)")
        if count > 0:
            sample = collection.peek(limit=1)
            doc = sample["documents"][0] if sample["documents"] else ""
            meta = sample["metadatas"][0] if sample["metadatas"] else {}
            preview = (doc[:120] + "...") if len(doc) > 120 else doc
            print(f"    sample: {preview!r}")
            print(f"    metadata: {meta}")
        print()

if __name__ == "__main__":
    main()
