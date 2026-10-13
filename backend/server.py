"""server.py - FastAPI Backend API Server for AI English Coach.

Serves endpoints:
- GET  /api/health
- GET  /api/modules/{track}/{level}        (Returns classes and questions from UI/modules or fallback)
- GET  /api/progress/{user_id}/{track}/{level}  (Retrieves saved completion status)
- POST /api/progress                        (Saves completion status to database)
- GET  /api/scores/{user_id}/{track}/{level}    (Retrieves scores from database)
- POST /api/scores                          (Records quiz/class score to database)
- POST /api/chat                            (Handles AI tutor messages via backend/chatbot.py)
- POST /api/meme/generate                   (Generates fresh learning memes via backend/meme_generator)
- Static files mounting: /UI, /backend/game, /output
"""

import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, Body, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.database import db
from backend import chatbot
from backend.meme_generator import meme_generator
from backend import mp3_txt_speaking_evaluator as speaking_evaluator

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = REPO_ROOT / "UI" / "modules"

app = FastAPI(title="AI English Coach API", version="1.0.0")

# Enable CORS for local development and UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Request & Response Models
# -----------------------------------------------------------------------------
class ProgressUpdate(BaseModel):
    user_id: str = "guest"
    track: str
    level: str
    module_id: str
    is_completed: bool = True


class ScoreRecord(BaseModel):
    user_id: str = "guest"
    track: str
    level: str
    module_id: str
    score: int
    total: int


class ChatRequest(BaseModel):
    user_id: str = "guest"
    message: str
    history: Optional[List[Dict[str, str]]] = None


class MemeRequest(BaseModel):
    user_id: str = "guest"
    topic: Optional[str] = "English Grammar & Vocabulary"
    count: int = 1  # 1 meme per click


class SpeakingTextRequest(BaseModel):
    transcript: str
    topic: Optional[str] = "Describe a memorable journey"
    prompt: Optional[str] = "Describe a memorable journey."
    model: Optional[str] = "deepseek-v4.1-flash:free"


# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": str(db.DB_PATH.exists()),
        "modules_dir": str(MODULES_DIR.exists())
    }


@app.get("/api/modules/{track}/{level}")
def get_module_data(track: str, level: str):
    """Loads module classes and questions from UI/modules/ or returns default structure."""
    candidates = [
        f"{level.upper()}.json",
        f"{level}.json",
        f"{level.replace('+', 'plus').upper()}.json",
        f"{level.replace('+', 'plus')}.json",
    ]
    if "b1" in level.lower() and ("+" in level or "plus" in level.lower()):
        candidates.extend(["B1plus.json", "B1+.json", "B1PLUS.json"])

    for cand in candidates:
        file_path = MODULES_DIR / track.lower() / cand
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read module file: {e}")

    # Fallback to js section if json is not yet created for higher levels
    for cand in [f"{level.upper()}.js", f"{level}.js", "B1plus.js" if "b1" in level.lower() and ("+" in level or "plus" in level.lower()) else ""]:
        if not cand:
            continue
        js_path = REPO_ROOT / "UI" / "js" / "practice" / track.lower() / cand
        if js_path.exists():
            try:
                with open(js_path, "r", encoding="utf-8") as f:
                    content = f.read()
                idx = content.find("=")
                if idx != -1:
                    raw_json = content[idx + 1:].strip().rstrip(";")
                    return json.loads(raw_json)
            except Exception:
                pass

    raise HTTPException(status_code=404, detail=f"Module not found for {track}/{level}")


@app.get("/api/progress/{user_id}/{track}/{level}")
def read_progress(user_id: str, track: str, level: str):
    """Retrieves all completed module IDs for a user, track, and level."""
    return db.get_user_progress(user_id, track, level)


@app.post("/api/progress")
def update_progress(payload: ProgressUpdate):
    """Persists completed module status to SQLite database."""
    db.save_progress(
        user_id=payload.user_id,
        track=payload.track,
        level=payload.level,
        module_id=payload.module_id,
        is_completed=payload.is_completed
    )
    return {"status": "success", "module_id": payload.module_id, "is_completed": payload.is_completed}


@app.get("/api/scores/{user_id}/{track}/{level}")
def read_scores(user_id: str, track: str, level: str):
    """Retrieves all recorded scores for a user, track, and level."""
    return db.get_latest_scores(user_id, track, level)


@app.post("/api/scores")
def submit_score(payload: ScoreRecord):
    """Saves a quiz or class score to the database."""
    res = db.record_score(
        user_id=payload.user_id,
        track=payload.track,
        level=payload.level,
        module_id=payload.module_id,
        score=payload.score,
        total=payload.total
    )
    return {"status": "success", "data": res}


@app.post("/api/chat")
def handle_chat(payload: ChatRequest):
    """Routes messages to the backend AI IELTS Coach chatbot."""
    reply = chatbot.get_bot_reply(payload.message, payload.user_id)
    return {"reply": reply}


@app.get("/api/meme/status")
def get_meme_status(user_id: str = "guest"):
    """Returns today's usage count, daily limit (15), remaining count, and cooldown timer."""
    return db.get_meme_rate_status(user_id)


@app.post("/api/meme/generate")
def create_meme(payload: MemeRequest):
    """Generates a batch of up to 3 memes, enforcing the 15/day quota and 30-min cooldown."""
    status = db.get_meme_rate_status(payload.user_id)

    # 1. Enforce 30-min cooldown
    if status["in_cooldown"]:
        secs = status["cooldown_remaining_seconds"]
        mins = max(1, round(secs / 60))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "cooldown_active",
                "message": f"Cooldown active: You created 3 memes. Please wait {mins} minute{'s' if mins != 1 else ''} before creating again.",
                "remaining_seconds": secs,
                "status": status
            }
        )

    # 2. Enforce 15 memes per day quota
    if status["remaining_today"] <= 0:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "daily_limit_reached",
                "message": "Daily limit reached: You have created all 15 memes for today. Come back tomorrow!",
                "status": status
            }
        )

    # 3. Determine batch count (default 1 per click, capped by remaining daily limit)
    requested = payload.count if payload.count > 0 else 1
    batch_count = min(requested, status["remaining_today"])

    try:
        concepts = meme_generator.generate_batch_meme_concepts(count=batch_count, topic=payload.topic)
    except Exception as e:
        import random
        selected = random.sample(meme_generator.FALLBACK_MEMES, min(batch_count, len(meme_generator.FALLBACK_MEMES)))
        concepts = [dict(m) for m in selected]

    # 4. Build image URLs for each meme (ensure 100% verified templates, no striped placeholders)
    memes = []
    for concept in concepts:
        tpl = meme_generator.sanitize_template(concept.get("template", "drake"))
        top_enc = meme_generator.sanitize_memegen_text(concept.get("top_text", ""))
        bot_enc = meme_generator.sanitize_memegen_text(concept.get("bottom_text", ""))
        img_url = f"https://api.memegen.link/images/{tpl}/{top_enc}/{bot_enc}.png"
        memes.append({
            "template": tpl,
            "top_text": concept.get("top_text", ""),
            "bottom_text": concept.get("bottom_text", ""),
            "topic": concept.get("topic", payload.topic),
            "joke": concept.get("joke", ""),
            "image_url": img_url
        })

    # 5. Record the batch in database to set 30-min cooldown and update day count
    stats = db.record_meme_batch(payload.user_id, memes)

    return {
        "success": True,
        "memes": memes,
        "count": len(memes),
        "stats": stats
    }


# -----------------------------------------------------------------------------
# Speaking Test Audio Evaluation Endpoints
# -----------------------------------------------------------------------------
@app.post("/api/speaking/evaluate")
async def evaluate_speaking_audio_endpoint(
    audio: UploadFile = File(...),
    topic: Optional[str] = Form("Describe a memorable journey"),
    prompt: Optional[str] = Form("Describe a memorable journey."),
    model: Optional[str] = Form("deepseek-v4.1-flash:free"),
    verify_compression: Optional[bool] = Form(True)
):
    """
    Receives voice recording from frontend speaking test, compresses and processes audio
    without quality loss, transcribes it, and evaluates IELTS criteria returning exact requested fields:
    - Fluency & Coherence
    - Lexical Resource
    - Grammatical Range
    - Pronunciation
    - Gap Analysis (with 🕳️ and 📚)
    - Where to improve (What you should have said, Better connectors, Focus topics next)
    """
    suffix = Path(audio.filename or "recording.webm").suffix or ".webm"
    temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    temp_path = temp_file.name
    temp_file.close()

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        result = speaking_evaluator.evaluate_speaking_audio(
            audio_path=temp_path,
            topic=topic,
            prompt=prompt,
            model=model or "deepseek-v4.1-flash:free",
            verify_compression=bool(verify_compression)
        )
        return result
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/speaking/evaluate-text")
def evaluate_speaking_text_endpoint(payload: SpeakingTextRequest):
    """Evaluates speaking test from transcript text directly, returning all valid fields."""
    return speaking_evaluator.evaluate_speaking_text(
        transcript=payload.transcript,
        topic=payload.topic,
        prompt=payload.prompt,
        model=payload.model or "deepseek-v4.1-flash:free"
    )


@app.post("/api/speaking/verify-compression")
async def verify_audio_compression_endpoint(audio: UploadFile = File(...)):
    """
    Compresses uploaded audio file and tests transcription with audio_to_txt
    to verify that compression maintains 100% speech quality.
    """
    suffix = Path(audio.filename or "sample.wav").suffix or ".wav"
    temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    temp_path = temp_file.name
    temp_file.close()

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        comp_path, comp_metrics = speaking_evaluator.compress_and_process_audio(
            temp_path,
            verify_with_audiototxt=True
        )

        import audio_to_txt
        orig_txt = audio_to_txt.transcribe_audio(temp_path)
        comp_txt = audio_to_txt.transcribe_audio(comp_path)

        match_ok = (orig_txt.strip().lower() == comp_txt.strip().lower())

        if comp_path != temp_path and os.path.exists(comp_path):
            try:
                os.remove(comp_path)
            except OSError:
                pass

        return {
            "success": True,
            "transcription_match": match_ok,
            "original_transcript": orig_txt,
            "compressed_transcript": comp_txt,
            "metrics": comp_metrics
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


# Mount Static Directories for direct web access
app.mount("/UI", StaticFiles(directory=str(REPO_ROOT / "UI"), html=True), name="ui")
app.mount("/game", StaticFiles(directory=str(REPO_ROOT / "backend" / "game"), html=True), name="game")
app.mount("/output", StaticFiles(directory=str(REPO_ROOT / "output")), name="output")
