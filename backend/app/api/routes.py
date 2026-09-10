from fastapi import APIRouter, HTTPException
from ..core.config import get_available_years
from ..models.chat import ChatRequest, ChatResponse, Source
from ..services.rag import generate_answer

router = APIRouter()


@router.get("/years")
def get_years():
    """Return the years that actually have ingested data in ChromaDB."""
    return {"years": get_available_years()}


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Send a question about a specific year and get CGK's answer."""
    available_years = get_available_years()

    if not available_years:
        raise HTTPException(
            status_code=400,
            detail="No data has been ingested yet. Run ingest.py, chunk.py, "
                   "then store.py for at least one year first."
        )

    if req.year not in available_years:
        raise HTTPException(
            status_code=400,
            detail=f"Year {req.year} is not available. Choose from {available_years}."
        )

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer, metadatas = generate_answer(req.year, req.question)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {e!s}")

    sources = [
        Source(
            title=m.get("title", ""),
            date=m.get("date", ""),
            category=m.get("category", ""),
            source=m.get("source", ""),
        )
        for m in metadatas
    ]

    return ChatResponse(
        year=req.year,
        question=req.question,
        answer=answer,
        sources=sources,
    )