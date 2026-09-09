"""
Easiest way to start the backend:

    cd backend
    python run.py

This avoids Python's relative-import restrictions that stop you from running
`python app/main.py` directly. It starts the one real FastAPI app
(app.main:app) on http://127.0.0.1:8000 with auto-reload.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
