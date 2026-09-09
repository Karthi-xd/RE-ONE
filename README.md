RE:ONE
Personal document intelligence over a yearly knowledge base.
Project Structure
```
RE-ONE/
├── frontend/          React + TypeScript UI (retro desktop, Notepad/Paint/Calculator, Historical RAG)
│   └── src/
├── backend/           Python + FastAPI backend (RAG + LLM)
│   ├── run.py         <- start the backend with this
│   └── app/
│       ├── main.py    <- the one FastAPI app (routes are in app/api/routes.py)
│       ├── rag/        one-off data-prep scripts (PDF -> chunks -> ChromaDB)
│       └── services/   RAG retrieval + answer generation used by the API
├── start.py            <- starts backend + frontend together
└── data/               Knowledge documents (place 2015.pdf, 2016.pdf, ... here)
```
First-time setup
```bash
pip install -r requirements.txt
cd frontend && npm install && cd ..
```
You also need Ollama installed and running locally with the model pulled once:
```bash
ollama pull qwen2.5:7b
```
Running it
Easiest way — from the project root, this starts both servers together:
```bash
python start.py
```
Backend:  http://127.0.0.1:8000
Frontend: http://localhost:5173
Press Ctrl+C once to stop both.
Running them separately (optional)
```bash
# backend
cd backend
python run.py

# frontend (separate terminal)
cd frontend
npm run dev
```
API
`GET  /api/years` -> `{ "years": [2015, 2016, 2017, 2018] }`
`POST /api/chat`  <- `{ "year": 2015, "question": "..." }`
-> `{ "year", "question", "answer", "sources": [...] }`
Available years come from `backend/app/core/config.py` (`available_years`), or override via a `.env` file (copy `.env.example` to `.env`).