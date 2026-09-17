import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..core.config import get_available_years
from ..models.chat import ChatRequest, ChatResponse, Source
from ..services.rag import generate_answer, stream_answer

router = APIRouter()


@router.get("/years")
def get_years():
    """Return the years that actually have ingested data in ChromaDB."""
    return {"years": get_available_years()}


def _validate_chat_request(req: ChatRequest) -> list[int]:
    """Shared validation for both the one-shot and streaming chat routes.
    Returns the list of available years, or raises HTTPException."""
    available_years = get_available_years()

    if not available_years:
        raise HTTPException(
            status_code=400,
            detail="No data has been ingested yet. Run ingest.py, chunk.py, "
                   "then store.py for at least one year first.",
        )

    if req.year not in available_years:
        raise HTTPException(
            status_code=400,
            detail=f"Year {req.year} is not available. Choose from {available_years}.",
        )

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    return available_years


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Send a question about a specific year and get an answer, all at
    once. Kept for callers that don't want a streaming response."""
    _validate_chat_request(req)

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


def _sse(event: str, data: dict) -> str:
    """Format one Server-Sent Events frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/chat/stream")
def chat_stream(req: ChatRequest):
    """Same as /chat, but streams the answer token-by-token over Server-Sent
    Events, so the frontend can render it live as the answer is "typing" instead of
    waiting for the whole answer to come back."""
    _validate_chat_request(req)

    def event_stream():
        try:
            for event in stream_answer(req.year, req.question):
                event_type = event.pop("type")
                yield _sse(event_type, event)
        except Exception as e:
            # Surface RAG/model errors to the client mid-stream instead of
            # just dropping the connection.
            yield _sse("error", {"detail": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Prevents any proxy in front of uvicorn from buffering the
            # whole response before sending it on.
            "X-Accel-Buffering": "no",
        },
    )