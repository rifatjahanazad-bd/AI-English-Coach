"""auth.py - User authentication, session management, and learner profile options."""

from fastapi import APIRouter, HTTPException
from backend.database import db
from backend.api.models.schemas import UserPreferencesRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/status")
def get_auth_status(user_id: str = "guest"):
    """Returns the current user session status and options."""
    user = db.get_or_create_user(user_id)
    return {
        "authenticated": True,
        "is_guest": user_id == "guest",
        "user": user
    }


@router.get("/user/{user_id}")
def get_user_profile(user_id: str):
    """Retrieves learner profile and stored options from database."""
    user = db.get_or_create_user(user_id)
    return user


@router.post("/preferences")
def update_preferences(payload: UserPreferencesRequest):
    """Updates learner options, UI settings, and study preferences in database."""
    user = db.update_user_preferences(payload.user_id, payload.preferences or {})
    return {
        "status": "success",
        "user": user
    }
