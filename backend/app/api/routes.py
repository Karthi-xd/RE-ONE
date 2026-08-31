from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, Source
from app.services.rag import generate_answer
from app.core.config import settings

router = APIRouter()


@router.get("/years")
def get_years():
    """Return the list of available years."""
    return {"years": settings.available_years}


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Send a question about a specific year and get CGK's answer."""
    if req.year not in settings.available_years:
        raise HTTPException(
            status_code=400,
            detail=f"Year {req.year} is not available. Choose from {settings.available_years}."
        )

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer, metadatas = generate_answer(req.year, req.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {str(e)}")

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
