"""config.py - Centralized configuration settings and path references."""

import os
from pathlib import Path
from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent
BACKEND_DIR = API_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

try:
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
except Exception:
    pass

# File paths
UI_DIR = REPO_ROOT / "UI"
INDEX_HTML = UI_DIR / "index.html"
MODULES_DIR = UI_DIR / "modules"
if os.getenv("VERCEL"):
    OUTPUT_DIR = Path("/tmp") / "output"
else:
    OUTPUT_DIR = REPO_ROOT / "output"
MEMES_OUTPUT_DIR = OUTPUT_DIR / "memes"
try:
    MEMES_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
GAME_DIR = BACKEND_DIR / "game"

DEFAULT_TOKENHARBOR_KEY = "thk_live_eaZnj0OdWrXhfX1KV2lva1NHnWSHr3OpBhTynZ8RpDTDVulz1j1-mQj6m92mr67R"
TOKENHARBOR_API_KEY = os.getenv("TOKENHARBOR_API_KEY") or os.getenv("OPENROUTER_API_KEY") or DEFAULT_TOKENHARBOR_KEY
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://tokenharbor.ai/v1")
MEME_MODEL = os.getenv("MODEL_NAME", "mimo-v2.6-flash:free")
SPEAKING_MODEL = os.getenv("SPEAKING_MODEL", "deepseek-v4.1-flash:free")

# Meme rate limits
DAILY_MEME_LIMIT = 15
BATCH_MEME_SIZE = 1  # 1 meme per click
MAX_CONSECUTIVE_MEMES = 3  # 3 memes trigger cooldown
COOLDOWN_MINUTES = 30

# CORS settings
_raw_cors = os.getenv("CORS_ORIGINS", "").strip()
if _raw_cors:
    CORS_ORIGINS = [orig.strip() for orig in _raw_cors.split(",") if orig.strip()]
else:
    CORS_ORIGINS = ["*"]
