"""db.py - SQLite database setup for AI English Coach.

Stores user progress, completed modules, scores, meme logs, and chat sessions.
All database files reside in the /database folder.
"""

import os
import sqlite3
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

DATABASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATABASE_DIR / "app.db"


def get_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with dict row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables for modules, scores, progress, and chat."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. User Progress Table (Track, Level, Module, Status, Last Updated)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id TEXT NOT NULL,
                track TEXT NOT NULL,
                level TEXT NOT NULL,
                module_id TEXT NOT NULL,
                is_completed INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, track, level, module_id)
            )
        """)

        # 2. Quiz Scores Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                track TEXT NOT NULL,
                level TEXT NOT NULL,
                module_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                percentage INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 3. Chat History / Sessions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4. Memes Log Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meme_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                template TEXT NOT NULL,
                top_text TEXT NOT NULL,
                bottom_text TEXT NOT NULL,
                topic TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 5. Meme Rate Limits Table (15/day quota, 30m cooldown after 3 memes)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meme_rate_limits (
                user_id TEXT PRIMARY KEY,
                day_date TEXT NOT NULL,
                day_count INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                last_batch_time TIMESTAMP,
                cooldown_until TIMESTAMP
            )
        """)
        # Ensure session_count column exists for existing databases
        try:
            cursor.execute("ALTER TABLE meme_rate_limits ADD COLUMN session_count INTEGER DEFAULT 0")
        except Exception:
            pass

        conn.commit()


DAILY_MEME_LIMIT = 15
BATCH_MEME_SIZE = 1  # 1 meme per click
MAX_CONSECUTIVE_MEMES = 3  # After 3 memes, 30 min cooldown
COOLDOWN_MINUTES = 30


def get_meme_rate_status(user_id: str = "guest") -> Dict[str, Any]:
    """Retrieves current rate limit, session count, and cooldown status for meme generation."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    now_ts = datetime.now()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, day_date, day_count, session_count, last_batch_time, cooldown_until
            FROM meme_rate_limits
            WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()

        if not row:
            return {
                "user_id": user_id,
                "today_count": 0,
                "session_count": 0,
                "daily_limit": DAILY_MEME_LIMIT,
                "remaining_today": DAILY_MEME_LIMIT,
                "consecutive_remaining": MAX_CONSECUTIVE_MEMES,
                "in_cooldown": False,
                "cooldown_remaining_seconds": 0,
                "cooldown_until": None,
                "can_generate": True,
                "reason": "ok",
                "batch_size": BATCH_MEME_SIZE
            }

        day_date = row["day_date"]
        # Reset counts if date has rolled over to a new day
        day_count = row["day_count"] if day_date == today_str else 0
        session_count = row["session_count"] if ("session_count" in row.keys() and row["session_count"] is not None) else 0
        cooldown_until_str = row["cooldown_until"]

        in_cooldown = False
        remaining_seconds = 0
        if cooldown_until_str:
            try:
                cooldown_dt = datetime.fromisoformat(cooldown_until_str)
                if now_ts < cooldown_dt:
                    in_cooldown = True
                    remaining_seconds = max(0, int((cooldown_dt - now_ts).total_seconds()))
                else:
                    # Cooldown has expired, reset session count
                    session_count = 0
            except Exception:
                pass

        remaining_today = max(0, DAILY_MEME_LIMIT - day_count)
        consecutive_remaining = max(0, MAX_CONSECUTIVE_MEMES - session_count)
        can_generate = (not in_cooldown) and (remaining_today > 0)

        reason = "ok"
        if in_cooldown:
            reason = "cooldown_active"
        elif remaining_today <= 0:
            reason = "daily_limit_reached"

        return {
            "user_id": user_id,
            "today_count": day_count,
            "session_count": session_count,
            "daily_limit": DAILY_MEME_LIMIT,
            "remaining_today": remaining_today,
            "consecutive_remaining": consecutive_remaining,
            "in_cooldown": in_cooldown,
            "cooldown_remaining_seconds": remaining_seconds,
            "cooldown_until": cooldown_until_str if in_cooldown else None,
            "can_generate": can_generate,
            "reason": reason,
            "batch_size": min(1, remaining_today) if can_generate else 0
        }


def record_meme_batch(user_id: str, memes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Records generated memes into history, enforces 3-meme session cooldown and daily limit."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    now_ts = datetime.now()

    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Log each generated meme in history
        for m in memes:
            cursor.execute("""
                INSERT INTO meme_history (user_id, template, top_text, bottom_text, topic, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                m.get("template", "drake"),
                m.get("top_text", ""),
                m.get("bottom_text", ""),
                m.get("topic", "English"),
                m.get("image_url", "")
            ))

        # 2. Update rate limits & session counts
        cursor.execute("SELECT day_date, day_count, session_count, cooldown_until FROM meme_rate_limits WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()

        new_day_count = len(memes)
        current_session = 0
        if row:
            if row["day_date"] == today_str:
                new_day_count += row["day_count"]
            if "session_count" in row.keys() and row["session_count"] is not None:
                # If was not in cooldown, keep session count
                current_session = row["session_count"]

        new_session = current_session + len(memes)
        in_cooldown = False
        cooldown_until_str = None
        remaining_seconds = 0

        # If user has generated 3 or more memes in this session, trigger 30-min cooldown
        if new_session >= MAX_CONSECUTIVE_MEMES:
            in_cooldown = True
            cooldown_dt = now_ts + timedelta(minutes=COOLDOWN_MINUTES)
            cooldown_until_str = cooldown_dt.isoformat()
            remaining_seconds = COOLDOWN_MINUTES * 60
            new_session = 0  # reset for when cooldown ends

        cursor.execute("""
            INSERT INTO meme_rate_limits (user_id, day_date, day_count, session_count, last_batch_time, cooldown_until)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                day_date = excluded.day_date,
                day_count = excluded.day_count,
                session_count = excluded.session_count,
                last_batch_time = excluded.last_batch_time,
                cooldown_until = excluded.cooldown_until
        """, (user_id, today_str, new_day_count, new_session, now_ts.isoformat(), cooldown_until_str))

        conn.commit()

    return {
        "user_id": user_id,
        "generated_count": len(memes),
        "today_count": new_day_count,
        "session_count": new_session,
        "daily_limit": DAILY_MEME_LIMIT,
        "remaining_today": max(0, DAILY_MEME_LIMIT - new_day_count),
        "in_cooldown": in_cooldown,
        "cooldown_remaining_seconds": remaining_seconds,
        "cooldown_until": cooldown_until_str
    }


# Convenience Database Access Functions
def save_progress(user_id: str, track: str, level: str, module_id: str, is_completed: bool = True):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_progress (user_id, track, level, module_id, is_completed, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, track, level, module_id) 
            DO UPDATE SET is_completed=excluded.is_completed, updated_at=CURRENT_TIMESTAMP
        """, (user_id, track, level, module_id, 1 if is_completed else 0))
        conn.commit()


def get_user_progress(user_id: str, track: str, level: str) -> Dict[str, bool]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT module_id, is_completed FROM user_progress
            WHERE user_id = ? AND track = ? AND level = ?
        """, (user_id, track, level))
        rows = cursor.fetchall()
        return {r["module_id"]: bool(r["is_completed"]) for r in rows}


def record_score(user_id: str, track: str, level: str, module_id: str, score: int, total: int):
    pct = round((score / total) * 100) if total > 0 else 0
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO quiz_scores (user_id, track, level, module_id, score, total, percentage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, track, level, module_id, score, total, pct))
        conn.commit()
    return {"score": score, "total": total, "percentage": pct}


def get_latest_scores(user_id: str, track: str, level: str) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT module_id, score, total, percentage, created_at
            FROM quiz_scores
            WHERE user_id = ? AND track = ? AND level = ?
            ORDER BY created_at DESC
        """, (user_id, track, level))
        rows = cursor.fetchall()
        scores = {}
        for r in rows:
            m = r["module_id"]
            if m not in scores:
                scores[m] = {
                    "score": r["score"],
                    "total": r["total"],
                    "percentage": r["percentage"],
                    "created_at": r["created_at"]
                }
        return scores


# Initialize on import
init_db()
