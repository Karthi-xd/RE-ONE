import sys
from pathlib import Path
import chromadb

YEAR = sys.argv[1] if len(sys.argv) > 1 else "2015"

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "data" / "chroma_db"


def main():
    client = chromadb.PersistentClient(path=str(DB_PATH))
    collection = client.get_or_create_collection(name=f"events_{YEAR}")

    query = input(f"Ask something about {YEAR}: ")

    results = collection.query(
        query_texts=[query],
        n_results=3
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]

    for i in range(len(documents)):
        print("\n---")
        print(f"Title: {metadatas[i].get('title')}")
        print(f"Date: {metadatas[i].get('date')}")
        print(documents[i])


if __name__ == "__main__":
    main()
