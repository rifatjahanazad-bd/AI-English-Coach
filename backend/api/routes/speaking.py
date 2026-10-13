"""speaking.py - IELTS Speaking test audio evaluation and compression endpoints."""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend import mp3_txt_speaking_evaluator as speaking_evaluator
from backend.api.models.schemas import SpeakingTextRequest

router = APIRouter(prefix="/api/speaking", tags=["speaking"])

SPEAKING_TOPICS = [
    {"id": "hometown", "name": "Hometown", "emoji": "🏠", "difficulty": "easy", "prompt": "Describe your hometown."},
    {"id": "work-study", "name": "Work/Study", "emoji": "💼", "difficulty": "medium", "prompt": "Describe your job or studies."},
    {"id": "hobbies", "name": "Hobbies", "emoji": "🎨", "difficulty": "easy", "prompt": "Describe a hobby you enjoy."},
    {"id": "travel", "name": "Travel", "emoji": "✈️", "difficulty": "medium", "prompt": "Describe a memorable journey."},
    {"id": "technology", "name": "Technology", "emoji": "💻", "difficulty": "hard", "prompt": "Describe a piece of technology you use daily."},
    {"id": "environment", "name": "Environment", "emoji": "🌍", "difficulty": "hard", "prompt": "Describe a way you help the environment."},
    {"id": "agriculture", "name": "Agriculture", "emoji": "🌾", "difficulty": "medium", "prompt": "Describe a farming practice you know."},
    {"id": "education", "name": "Education", "emoji": "📚", "difficulty": "easy", "prompt": "Describe a teacher who influenced you."},
    {"id": "culture", "name": "Culture", "emoji": "🎭", "difficulty": "medium", "prompt": "Describe a cultural tradition in your country."},
    {"id": "sports", "name": "Sports", "emoji": "⚽", "difficulty": "easy", "prompt": "Describe a sport you enjoy watching or playing."},
    {"id": "food", "name": "Food", "emoji": "🍜", "difficulty": "easy", "prompt": "Describe a traditional dish from your country."},
    {"id": "health", "name": "Health", "emoji": "🏥", "difficulty": "medium", "prompt": "Describe a healthy habit you have."},
    {"id": "music", "name": "Music", "emoji": "🎵", "difficulty": "easy", "prompt": "Describe a song that means a lot to you."},
    {"id": "books", "name": "Books", "emoji": "📖", "difficulty": "medium", "prompt": "Describe a book that changed your perspective."},
    {"id": "movies", "name": "Movies", "emoji": "🎬", "difficulty": "easy", "prompt": "Describe a movie you recently enjoyed."},
    {"id": "weather", "name": "Weather", "emoji": "🌤️", "difficulty": "easy", "prompt": "Describe your favourite type of weather."},
    {"id": "transport", "name": "Transport", "emoji": "🚌", "difficulty": "medium", "prompt": "Describe how you usually travel to work or school."},
    {"id": "shopping", "name": "Shopping", "emoji": "🛍️", "difficulty": "easy", "prompt": "Describe a memorable shopping experience."},
    {"id": "family", "name": "Family", "emoji": "👨‍👩‍👧", "difficulty": "easy", "prompt": "Describe a family member you admire."},
    {"id": "friendship", "name": "Friendship", "emoji": "🤝", "difficulty": "medium", "prompt": "Describe a close friend and why they matter."},
    {"id": "city-life", "name": "City Life", "emoji": "🏙️", "difficulty": "medium", "prompt": "Describe what you like about city life."},
    {"id": "rural-life", "name": "Rural Life", "emoji": "🌻", "difficulty": "hard", "prompt": "Describe the advantages of living in the countryside."},
    {"id": "volunteering", "name": "Volunteering", "emoji": "🤲", "difficulty": "hard", "prompt": "Describe a volunteering experience you had."},
    {"id": "future-plans", "name": "Future Plans", "emoji": "🌟", "difficulty": "medium", "prompt": "Describe a goal you want to achieve in the future."}
]


@router.post("/evaluate")
async def evaluate_speaking_audio(
    audio: UploadFile = File(...),
    topic: Optional[str] = Form("Describe a memorable journey"),
    prompt: Optional[str] = Form("Describe a memorable journey."),
    model: Optional[str] = Form("deepseek-v4.1-flash:free"),
    verify_compression: Optional[bool] = Form(True)
):
    """
    Receives voice recording from frontend speaking test, compresses audio without
    quality loss, transcribes it, and evaluates IELTS criteria returning exact fields:
    - Fluency & Coherence, Lexical Resource, Grammatical Range, Pronunciation
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


@router.post("/evaluate-text")
def evaluate_speaking_text(payload: SpeakingTextRequest):
    """Evaluates speaking test from transcript text directly, returning all valid fields."""
    return speaking_evaluator.evaluate_speaking_text(
        transcript=payload.transcript,
        topic=payload.topic,
        prompt=payload.prompt,
        model=payload.model or "deepseek-v4.1-flash:free"
    )


@router.post("/verify-compression")
async def verify_audio_compression(audio: UploadFile = File(...)):
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


@router.get("/topics")
def get_speaking_topics():
    """Returns all 24 IELTS speaking topics with cues."""
    return {"topics": SPEAKING_TOPICS, "total": len(SPEAKING_TOPICS)}


@router.get("/topic/{topic_id}")
def get_single_speaking_topic(topic_id: str):
    """Path parameter endpoint: retrieves specific topic prompt by slug or id."""
    norm = topic_id.strip().lower().replace("_", "-")
    for t in SPEAKING_TOPICS:
        if t["id"] == norm or t["name"].lower() == norm:
            return t
    return {
        "id": topic_id,
        "name": topic_id.replace("-", " ").title(),
        "emoji": "🎙️",
        "difficulty": "medium",
        "prompt": f"Describe your thoughts and experiences with {topic_id.replace('-', ' ')}."
    }
