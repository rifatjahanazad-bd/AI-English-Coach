"""api/index.py - Vercel Serverless Function entry point for FastAPI backend."""

import os
import sys
from pathlib import Path

# Add project root to sys.path so backend modules are discovered
file_dir = Path(__file__).resolve().parent
candidates = [
    file_dir.parent,           # Repo root (when running in api/index.py)
    file_dir,                  # When running in root
    Path.cwd(),                # Current working directory
    Path("/var/task"),         # AWS Lambda / Vercel runtime root
]

for p in candidates:
    p_str = str(p)
    if (p / "backend").exists() and p_str not in sys.path:
        sys.path.insert(0, p_str)

from backend.server import app
