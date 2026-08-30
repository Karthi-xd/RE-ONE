from fastapi import FastAPI
from pathlib import Path
import chromadb

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "data" / "chroma_db"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_or_create_collection(name="events_2015")


@app.get("/search")
def search(query: str, n_results: int = 3):
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]

    response = []
    for i in range(len(documents)):
        response.append({
            "text": documents[i],
            "metadata": metadatas[i]
        })

    return {"query": query, "results": response}