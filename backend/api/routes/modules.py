"""modules.py - Curriculum modules, class exercises, progress tracking, and quiz scores.

Pulls curriculum modules directly from the SQLite database for maximum speed
and persistent consistency.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from backend.database import db
from backend.api.config import MODULES_DIR, REPO_ROOT
from backend.api.models.schemas import ProgressUpdate, ScoreRecord

router = APIRouter(prefix="/api", tags=["modules"])


@router.get("/modules")
def list_all_modules():
    """Lists all available curriculum tracks and CEFR levels loaded in the database."""
    items = db.list_curriculum_modules_from_db()
    return {"modules": items, "count": len(items)}


@router.get("/modules/{track}/{level}")
def get_module_data(track: str, level: str):
    """
    Pulls module curriculum classes and exercises directly from SQLite database.
    If not cached in database, falls back to JSON files and seeds the DB automatically.
    """
    # 1. Pull directly from SQLite database
    mod_data = db.get_module_from_db(track, level)
    if mod_data:
        return mod_data

    # 2. Fallback to filesystem and auto-seed if needed
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
                    loaded = json.load(f)
                # Seed into DB for subsequent instant retrieval
                db.seed_curriculum_modules(force=True)
                return loaded
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read module file: {e}")

    # Fallback to js file format if json is not yet created
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


@router.get("/modules/{track}/{level}/{class_id}")
def get_single_class_data(track: str, level: str, class_id: str):
    """
    Path parameter endpoint: Retrieves a specific class and its questions
    within a track and level directly from SQLite database.
    e.g. /api/modules/grammar/a1/class02 or /api/modules/grammar/a1/1
    """
    # 1. Pull from SQLite database
    class_info = db.get_class_from_db(track, level, class_id)
    if class_info:
        return class_info

    # 2. Fallback to full module matching
    mod_data = get_module_data(track, level)
    classes = mod_data.get("classes") or mod_data.get("items") or []

    norm_target = class_id.strip().lower().replace("_", "").replace("-", "")
    for idx, c in enumerate(classes):
        cid = str(c.get("id", "")).strip().lower().replace("_", "").replace("-", "")
        if cid and cid == norm_target:
            return {
                "track": track.lower(),
                "level": level.upper(),
                "class_id": class_id,
                "class_index": idx,
                "class": c,
                "total_classes": len(classes),
                "level_meta": {
                    "title": mod_data.get("title", f"{level.upper()} Curriculum"),
                    "emoji": mod_data.get("emoji", "📐"),
                    "count": len(classes)
                }
            }

    import re
    digits = re.findall(r"\d+", class_id)
    if digits:
        target_num = int(digits[0])
        if 1 <= target_num <= len(classes):
            idx = target_num - 1
            return {
                "track": track.lower(),
                "level": level.upper(),
                "class_id": class_id,
                "class_index": idx,
                "class": classes[idx],
                "total_classes": len(classes),
                "level_meta": {
                    "title": mod_data.get("title", f"{level.upper()} Curriculum"),
                    "emoji": mod_data.get("emoji", "📐"),
                    "count": len(classes)
                }
            }

    raise HTTPException(status_code=404, detail=f"Class '{class_id}' not found in {track}/{level}")


@router.get("/progress/{user_id}/{track}/{level}")
def read_progress(user_id: str, track: str, level: str):
    """Retrieves all completed module IDs for a user, track, and level."""
    return db.get_user_progress(user_id, track, level)


@router.post("/progress")
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


@router.get("/scores/{user_id}/{track}/{level}")
def read_scores(user_id: str, track: str, level: str):
    """Retrieves all recorded scores for a user, track, and level."""
    return db.get_latest_scores(user_id, track, level)


@router.post("/scores")
def submit_score(payload: ScoreRecord):
    """Saves a quiz or class score to the SQLite database."""
    res = db.record_score(
        user_id=payload.user_id,
        track=payload.track,
        level=payload.level,
        module_id=payload.module_id,
        score=payload.score,
        total=payload.total
    )
    return {"status": "success", "data": res}
