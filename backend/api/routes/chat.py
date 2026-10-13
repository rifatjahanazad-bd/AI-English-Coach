"""chat.py - AI Personal Mentor & Conversational Tutor endpoint."""

from fastapi import APIRouter
from backend import chatbot
from backend.database import db
from backend.api.models.schemas import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def handle_chat(payload: ChatRequest):
    """Routes messages to the backend AI IELTS Coach chatbot."""
    reply = chatbot.get_bot_reply(payload.message, payload.user_id)
    return {"reply": reply}


@router.get("/history/{user_id}")
def get_chat_history(user_id: str = "guest"):
    """Retrieves previous chat messages for this user."""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT sender, message, created_at
            FROM chat_history
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT 50
        """, (user_id,))
        rows = cursor.fetchall()
        return {"history": [dict(r) for r in rows]}
