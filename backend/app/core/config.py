from pathlib import Path
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings
import chromadb


class Settings(BaseSettings):
    app_name: str = "RE:ONE"
    ollama_model: str = "qwen2.5:7b"
    n_results: int = 3
    db_path: Path = Path(__file__).resolve().parents[3] / "data" / "chroma_db"

    class Config:
        env_file = ".env"


settings = Settings()


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.PersistentClient:
    """A single Chroma client, reused for the life of the process.

    chromadb.PersistentClient() re-initializes the embedding model on
    every construction, and both get_available_years() and the RAG
    pipeline's retrieve() used to build a fresh one per request - meaning
    every single message paid that setup cost twice, on top of whatever
    the model itself took to answer. Caching it means that cost is paid
    once, on the first request after the server starts, not on every
    message after that.
    """
    return chromadb.PersistentClient(path=str(settings.db_path))


def get_available_years() -> list[int]:
    """
    Discover which years actually have ingested data, by reading the
    ChromaDB collections directly, instead of relying on a hardcoded
    list that goes stale every time a new year is ingested.

    Each year is stored as its own collection named "events_<year>"
    (see rag/store.py), so we just list collections and pull the year
    out of the name.
    """
    if not settings.db_path.exists():
        return []

    client = get_chroma_client()
    years = []

    for collection in client.list_collections():
        name = collection.name
        if name.startswith("events_"):
            year_part = name.removeprefix("events_")
            if year_part.isdigit():
                years.append(int(year_part))

    return sorted(years)