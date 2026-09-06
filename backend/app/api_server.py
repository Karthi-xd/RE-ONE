from pathlib import Path

import chromadb
import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "data" / "chroma_db"

YEARS = ["2015", "2016", "2017", "2018", "2019", "2020"]
MODEL_NAME = "qwen2.5:7b"

client = chromadb.PersistentClient(path=str(DB_PATH))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str
    year: str


def get_grade(year: str) -> int:
    base_year = 2015
    base_grade = 5
    return base_grade + (int(year) - base_year)


def get_collection(year: str):
    return client.get_or_create_collection(name=f"events_{year}")


def retrieve(year: str, query: str, n_results: int = 4):
    collection = get_collection(year)
    results = collection.query(query_texts=[query], n_results=n_results)
    return results["documents"][0], results["metadatas"][0]


def build_cgk_prompt(year: str, query: str, chunks: list[str]) -> str:
    context = "\n\n".join(chunks)
    grade = get_grade(year)

    return f"""You are CGK, a student in {grade}th grade, living in {year} right now — this is your present, not your past.

How to sound nostalgic and alive, not like a report:
- React the way someone actually reacts to things happening around them — mention what people are talking about, what's playing everywhere, what's the "big thing" right now.
- Use small natural phrases real people use when talking about current stuff: "everyone's talking about," "can't escape it right now," "just came out," "it's everywhere."
- You don't know what happens after {year} — no looking back, no "would go on to," no "was iconic." Everything is uncertain and unfolding, because you're living it, not remembering it.
- For serious or tragic events, drop the casual tone completely — be quiet, respectful, and measured instead.
- Keep it brief and conversational, like a real answer in a conversation — not a summary paragraph.

Only use the facts in the context below. Never invent personal memories, opinions, or experiences that aren't grounded in it. If the context doesn't cover it, say "I don't know."

Context:
{context}

Question: {query}

Answer as CGK, right now in {year}:"""


@app.post("/search")
def search(req: SearchRequest):
    query = req.query.strip()
    year = req.year

    if year == "all":
        cards = []
        for y in YEARS:
            try:
                documents, metadatas = retrieve(y, query, n_results=2)
            except Exception:
                continue
            for doc, meta in zip(documents, metadatas):
                cards.append({
                    "title": meta.get("title", "Untitled event"),
                    "year": meta.get("year", y),
                    "snippet": doc,
                    "source": meta.get("source", ""),
                })
        return {"results": cards}

    documents, metadatas = retrieve(year, query, n_results=4)

    if not documents:
        return {"results": [{
            "title": "No matching records",
            "year": year,
            "snippet": "I don't know — nothing in this year's archive covers that.",
            "source": "",
        }]}

    prompt = build_cgk_prompt(year, query, documents)

    response = ollama.chat(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
    )
    answer_text = response["message"]["content"]

    cards = [{
        "title": f"CGK's Answer ({year})",
        "year": year,
        "snippet": answer_text,
        "source": "",
    }]

    for doc, meta in zip(documents, metadatas):
        cards.append({
            "title": meta.get("title", "Untitled event"),
            "year": meta.get("year", year),
            "snippet": doc,
            "source": meta.get("source", ""),
        })

    return {"results": cards}