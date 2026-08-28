# RE:ONE

Personal document intelligence over a yearly knowledge base.

## Project Structure

```
RE-ONE/
├── frontend/          React + TypeScript UI (year timeline, dynamic year UI, chat, evidence/citations)
│   └── src/
├── backend/           Python + FastAPI backend (RAG + LLM)
│   └── app/
│       ├── rag/       RAG pipeline (PDF → parse → chunk → metadata → embeddings → ChromaDB → retrieval → LLM → verification → citations)
│       └── main.py
└── data/              Knowledge documents (place 2015.pdf here)
```

## Status

Initial project structure only. No functionality implemented yet.
