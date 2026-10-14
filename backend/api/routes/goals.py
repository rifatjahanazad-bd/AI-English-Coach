import re
from fastapi import APIRouter, HTTPException
from backend.database import db
from backend.api.models.schemas import GoalRequest

router = APIRouter(prefix="/api/goal", tags=["goals"])

USER_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.@]{1,128}$")


def _sanitize_user_id(uid: str) -> str:
    clean_id = (uid or "").strip()
    if not clean_id or not USER_ID_REGEX.match(clean_id):
        return "guest"
    return clean_id


@router.get("/{user_id}")
def get_user_goal(user_id: str):
    """Retrieves target study objectives, band goal, and focus area."""
    valid_id = _sanitize_user_id(user_id)
    return db.get_user_goal(valid_id)


@router.post("")
def save_user_goal(payload: GoalRequest):
    """Saves or updates user target band and study plan."""
    valid_id = _sanitize_user_id(payload.user_id)
    return db.save_user_goal(
        user_id=valid_id,
        target_band=max(1.0, min(9.0, float(payload.target_band))),
        target_exam_date=payload.target_exam_date or "",
        daily_minutes=max(5, min(720, int(payload.daily_minutes or 30))),
        current_focus=(payload.current_focus or "Fluency & Coherence")[:64],
        target_level=(payload.target_level or "B2")[:16],
        notes=(payload.notes or "")[:500],
    )
