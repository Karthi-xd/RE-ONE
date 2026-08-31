from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "RE:ONE"
    ollama_model: str = "qwen2.5:7b"
    n_results: int = 3
    available_years: list[int] = [2015, 2016, 2017, 2018]
    db_path: Path = Path(__file__).resolve().parents[3] / "data" / "chroma_db"

    class Config:
        env_file = ".env"


settings = Settings()
