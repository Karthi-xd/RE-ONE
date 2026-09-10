from pathlib import Path
frfrom pathlib import Path
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

    client = chromadb.PersistentClient(path=str(settings.db_path))
    years = []

    for collection in client.list_collections():
        name = collection.name
        if name.startswith("events_"):
            year_part = name.removeprefix("events_")
            if year_part.isdigit():
                years.append(int(year_part))

    return sorted(years)