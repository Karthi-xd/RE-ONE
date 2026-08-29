from pathlib import Path
import chromadb

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "data" / "chroma_db"


def main():
    client = chromadb.PersistentClient(path=str(DB_PATH))
    collection = client.get_or_create_collection(name="events_2015")

    query = input("Ask something about 2015: ")

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