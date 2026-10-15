import re
from fastapi import APIRouter, HTTPException, Request
from backend import chatbot
from backend.database import db
from backend.api.models.schemas import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])

USER_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.@]{1,128}$")


def _sanitize_user_id(uid: str) -> str:
    clean_id = (uid or "").strip()
    if not clean_id or not USER_ID_REGEX.match(clean_id):
        return "guest"
    return clean_id


@router.post("")
@router.post("/")
def handle_chat(payload: ChatRequest, request: Request):
    """Routes messages to the backend AI IELTS Coach chatbot and records conversation history."""
    valid_id = _sanitize_user_id(payload.user_id)
    message_text = (payload.message or "").strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Chat message cannot be empty.")

    # Prevent global lockout for guest visitors: derive per-client IP identifier for rate limiting
    if valid_id == "guest":
        client_ip = (request.client.host if request.client else "127.0.0.1").replace(":", "_")
        rate_id = f"guest_{client_ip}"
    else:
        rate_id = valid_id

    try:
        reply = chatbot.chat(user_id=rate_id, text=message_text)
    except Exception as e:
        print(f"[error] Chatbot error: {e}")
        reply = chatbot.generate_offline_ielts_reply(message_text)

    # Persist both user message and bot reply into SQLite chat_history
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_history (user_id, sender, message)
                VALUES (?, 'user', ?)
            """, (valid_id, message_text))
            cursor.execute("""
                INSERT INTO chat_history (user_id, sender, message)
                VALUES (?, 'assistant', ?)
            """, (valid_id, reply))
            conn.commit()
    except Exception as db_err:
        print(f"⚠️ [Chat DB Warning]: {db_err}")

    return {"reply": reply}


@router.get("/history")
@router.get("/history/")
@router.get("/history/{user_id}")
@router.get("/history/{user_id}/")
def get_chat_history(user_id: str = "guest"):
    """Retrieves previous chat messages for this user."""
    valid_id = _sanitize_user_id(user_id)
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT sender, message, created_at
            FROM chat_history
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT 50
        """, (valid_id,))
        rows = cursor.fetchall()
        return {"history": [dict(r) for r in rows]}
