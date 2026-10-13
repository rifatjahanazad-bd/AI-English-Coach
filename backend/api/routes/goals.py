"""goals.py - Learner targets, IELTS band goals, and daily study objectives."""

from fastapi import APIRouter
from backend.database import db
from backend.api.models.schemas import GoalRequest

router = APIRouter(prefix="/api/goal", tags=["goals"])


@router.get("/{user_id}")
def get_user_goal(user_id: str):
    """Retrieves target study objectives, band goal, and focus area."""
    return db.get_user_goal(user_id)


@router.post("")
def save_user_goal(payload: GoalRequest):
    """Saves or updates user target band and study plan."""
    return db.save_user_goal(
        user_id=payload.user_id,
        target_band=payload.target_band,
        target_exam_date=payload.target_exam_date or "",
        daily_minutes=payload.daily_minutes,
        current_focus=payload.current_focus or "Fluency & Coherence",
        target_level=payload.target_level or "B2",
        notes=payload.notes or "",
    )
