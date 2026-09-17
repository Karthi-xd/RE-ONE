from pathlib import Path
from pathlib import Path
from pydantic_settings import BaseSettings
import chromadb


class Settings(BaseSettings):
    app_name: str = "RE:ONE"
    ollama_model: str = "qwen2.5:7b"
    n_results: int = 3
    db_path: Path = Path(__file__).resolve().parents[3] / "data" / "chroma_db"

    # Chroma's default embedding function (MiniLM-L6-v2) + default HNSW
    # space returns a *distance*, not a similarity score, and it ALWAYS
    # returns your n_results nearest neighbours even if none of them are
    # actually related to the query - there's no built-in "nothing matched"
    # signal. This is the threshold below which we trust a retrieved chunk
    # is genuinely about the question; above it, we treat the archive as
    # having nothing relevant and skip using the chunk at all.
    #
    # Typical observed ranges with this setup: a chunk that's really about
    # what was asked scores well under 1.0; an unrelated chunk that just
    # shares a word or two typically lands 1.3+. Log the real distances
    # you see in your own data (see rag.py) and adjust this if genuine
    # answers get rejected or junk still slips through.
    relevance_threshold: float = 1.15

    class Config:
        env_file = ".env"


settings = Settings()

# Opened once, here, and reused everywhere (routes.py's /years endpoint
# and rag.py's retrieval both import this). Every place that used to call
# `chromadb.PersistentClient(...)` fresh on each request was paying the
# cost of re-opening the on-disk index from scratch every single time -
# noticeable on every message, not just the first one.
chroma_client = chromadb.PersistentClient(path=str(settings.db_path))


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

    years = []

    for collection in chroma_client.list_collections():
        name = collection.name
        if name.startswith("events_"):
            year_part = name.removeprefix("events_")
            if year_part.isdigit():
                years.append(int(year_part))

    return sorted(years)