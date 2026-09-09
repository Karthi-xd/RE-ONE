"""
Starts both the backend and frontend dev servers together.

Usage (from the project root, RE-ONE/):

    python start.py

Backend  -> http://127.0.0.1:8000
Frontend -> http://localhost:5173

Press Ctrl+C once to stop both.

First-time setup (only needed once):
    pip install -r requirements.txt
    cd frontend && npm install && cd ..
"""

import shutil
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def main() -> None:
    npm = shutil.which("npm")
    if npm is None:
        print("npm was not found on PATH. Install Node.js first: https://nodejs.org")
        sys.exit(1)

    backend_proc = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=BACKEND_DIR,
    )
    frontend_proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND_DIR,
    )

    procs = [backend_proc, frontend_proc]

    def shutdown(*_args):
        print("\nStopping backend and frontend...")
        for p in procs:
            if p.poll() is None:
                p.terminate()
        for p in procs:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("Backend:  http://127.0.0.1:8000")
    print("Frontend: http://localhost:5173")
    print("Press Ctrl+C to stop both.\n")

    # Exit if either process dies on its own.
    while True:
        for p in procs:
            if p.poll() is not None:
                shutdown()
        try:
            backend_proc.wait(timeout=1)
        except subprocess.TimeoutExpired:
            pass


if __name__ == "__main__":
    main()
