from pydantic import BaseModel


class ChatRequest(BaseModel):
    year: int
    question: str


class Source(BaseModel):
    title: str
    date: str
    category: str
    source: str


class ChatResponse(BaseModel):
    year: int
    question: str
    answer: str
    sources: list[Source]
