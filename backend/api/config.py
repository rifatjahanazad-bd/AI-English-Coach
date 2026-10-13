"""config.py - Centralized configuration settings and path references."""

import os
from pathlib import Path
from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent
BACKEND_DIR = API_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

# Load environment variables
for candidate in [
    BACKEND_DIR / "meme_generator" / ".env",
    BACKEND_DIR / ".env",
    REPO_ROOT / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate)
        break
else:
    load_dotenv()

# File paths
UI_DIR = REPO_ROOT / "UI"
INDEX_HTML = UI_DIR / "index.html"
MODULES_DIR = UI_DIR / "modules"
OUTPUT_DIR = REPO_ROOT / "output"
MEMES_OUTPUT_DIR = OUTPUT_DIR / "memes"
MEMES_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
GAME_DIR = BACKEND_DIR / "game"

# API & Model configurations
TOKENHARBOR_API_KEY = os.getenv("TOKENHARBOR_API_KEY") or os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://tokenharbor.ai/v1")
MEME_MODEL = os.getenv("MODEL_NAME", "mimo-v2.6-flash:free")
SPEAKING_MODEL = os.getenv("SPEAKING_MODEL", "deepseek-v4.1-flash:free")

# Meme rate limits
DAILY_MEME_LIMIT = 15
BATCH_MEME_SIZE = 1  # 1 meme per click
MAX_CONSECUTIVE_MEMES = 3  # 3 memes trigger cooldown
COOLDOWN_MINUTES = 30

# CORS settings
CORS_ORIGINS = ["*"]
