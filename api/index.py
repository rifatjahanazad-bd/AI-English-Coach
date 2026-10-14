"""api/index.py - Vercel Serverless Function entry point for FastAPI backend."""

import sys
from pathlib import Path

# Add project root to sys.path so backend modules are discovered
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.server import app
