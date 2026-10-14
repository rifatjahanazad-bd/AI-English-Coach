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
if os.getenv("VERCEL") or not os.access(DATABASE_DIR, os.W_OK):
    import shutil
    tmp_db = Path("/tmp") / "app.db"
    orig_db = DATABASE_DIR / "app.db"
    if orig_db.exists() and not tmp_db.exists():
        try:
            shutil.copy2(orig_db, tmp_db)
        except Exception:
            pass
    DB_PATH = tmp_db
else:
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

        # 6. User Goal & Study Objectives Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_goals (
                user_id TEXT PRIMARY KEY,
                target_band REAL DEFAULT 7.5,
                target_exam_date TEXT,
                daily_minutes INTEGER DEFAULT 30,
                current_focus TEXT DEFAULT 'Fluency & Coherence',
                target_level TEXT DEFAULT 'B2',
                notes TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 7. Curriculum Modules Table (Stored in database as requested)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS curriculum_modules (
                track TEXT NOT NULL,
                level TEXT NOT NULL,
                title TEXT,
                emoji TEXT,
                topic_count INTEGER DEFAULT 0,
                data_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (track, level)
            )
        """)

        # 8. Curriculum Classes Table (Fast indexable class & drill lookup)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS curriculum_classes (
                track TEXT NOT NULL,
                level TEXT NOT NULL,
                class_id TEXT NOT NULL,
                class_index INTEGER NOT NULL,
                title TEXT,
                class_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (track, level, class_id)
            )
        """)

        # 9. Users & Preferences Table (For user data and future profile options)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                display_name TEXT DEFAULT 'Learner',
                email TEXT,
                role TEXT DEFAULT 'learner',
                preferences_json TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 10. Manual Accounts Table (name, phone, email, username, password_hash)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT DEFAULT '',
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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


def get_user_goal(user_id: str) -> Dict[str, Any]:
    """Retrieves target IELTS band and learning goal settings for user."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, target_band, target_exam_date, daily_minutes, current_focus, target_level, notes, updated_at
            FROM user_goals
            WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            return {
                "user_id": user_id,
                "target_band": 7.5,
                "target_exam_date": "",
                "daily_minutes": 30,
                "current_focus": "Fluency & Coherence",
                "target_level": "B2",
                "notes": "Aim for cohesive fluency and rich lexical resource.",
                "updated_at": None
            }
        return dict(row)


def save_user_goal(user_id: str, target_band: float = 7.5, target_exam_date: str = "",
                   daily_minutes: int = 30, current_focus: str = "Fluency & Coherence",
                   target_level: str = "B2", notes: str = "") -> Dict[str, Any]:
    """Saves or updates the user study target goal."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_goals (user_id, target_band, target_exam_date, daily_minutes, current_focus, target_level, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                target_band = excluded.target_band,
                target_exam_date = excluded.target_exam_date,
                daily_minutes = excluded.daily_minutes,
                current_focus = excluded.current_focus,
                target_level = excluded.target_level,
                notes = excluded.notes,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, float(target_band), target_exam_date, int(daily_minutes), current_focus, target_level, notes))
        conn.commit()
    return get_user_goal(user_id)


# -------------------------------------------------------------------------
# Curriculum Modules & Classes Database Management
# -------------------------------------------------------------------------
REPO_ROOT = DATABASE_DIR.parents[1] if len(DATABASE_DIR.parents) >= 2 else DATABASE_DIR.parent
MODULES_DIR = REPO_ROOT / "UI" / "modules"


def seed_curriculum_modules(force: bool = False) -> int:
    """
    Seeds curriculum modules and classes from UI/modules/ JSON files
    into SQLite database if empty or if force=True.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM curriculum_modules")
        count = cursor.fetchone()["count"]

        if count > 0 and not force:
            return count

        if not MODULES_DIR.exists():
            return 0

        total_seeded = 0
        for track_dir in MODULES_DIR.iterdir():
            if not track_dir.is_dir():
                continue
            track_name = track_dir.name.lower()

            for json_file in track_dir.glob("*.json"):
                level_name = json_file.stem.upper()
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        mod_data = json.load(f)

                    title = mod_data.get("title", f"{level_name} Curriculum")
                    emoji = mod_data.get("emoji", "📐")
                    classes = mod_data.get("classes") or mod_data.get("items") or []
                    topic_count = len(classes)
                    data_json = json.dumps(mod_data, ensure_ascii=False)

                    # Store full module document
                    cursor.execute("""
                        INSERT INTO curriculum_modules (track, level, title, emoji, topic_count, data_json, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(track, level) DO UPDATE SET
                            title = excluded.title,
                            emoji = excluded.emoji,
                            topic_count = excluded.topic_count,
                            data_json = excluded.data_json,
                            updated_at = CURRENT_TIMESTAMP
                    """, (track_name, level_name, title, emoji, topic_count, data_json))

                    # Index each class individually for sub-millisecond retrieval
                    for idx, c in enumerate(classes):
                        cid = str(c.get("id", f"class{idx+1:02d}")).strip()
                        c_title = c.get("title", f"Class {idx+1}")
                        class_json = json.dumps(c, ensure_ascii=False)
                        cursor.execute("""
                            INSERT INTO curriculum_classes (track, level, class_id, class_index, title, class_json, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(track, level, class_id) DO UPDATE SET
                                class_index = excluded.class_index,
                                title = excluded.title,
                                class_json = excluded.class_json,
                                updated_at = CURRENT_TIMESTAMP
                        """, (track_name, level_name, cid, idx, c_title, class_json))

                    total_seeded += 1
                except Exception as e:
                    print(f"  ⚠️ Error seeding module {json_file}: {e}")

        conn.commit()
        return total_seeded


def get_module_from_db(track: str, level: str) -> Optional[Dict[str, Any]]:
    """Retrieves full curriculum module directly from SQLite database."""
    track_norm = track.strip().lower()
    level_norm = level.strip().upper()

    # Normalize B1+ / B1PLUS
    level_variants = [level_norm, level_norm.replace("+", "PLUS"), level_norm.replace("PLUS", "+")]

    with get_connection() as conn:
        cursor = conn.cursor()
        for lvl in level_variants:
            cursor.execute("""
                SELECT data_json FROM curriculum_modules
                WHERE track = ? AND (level = ? OR UPPER(level) = ?)
            """, (track_norm, lvl, lvl))
            row = cursor.fetchone()
            if row and row["data_json"]:
                return json.loads(row["data_json"])
    return None


def get_class_from_db(track: str, level: str, class_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a specific class from the database using direct class_id,
    index (e.g. 1 or class02), or slug.
    """
    track_norm = track.strip().lower()
    level_norm = level.strip().upper()
    cid_norm = class_id.strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        # 1. Exact class_id match
        cursor.execute("""
            SELECT track, level, class_id, class_index, title, class_json
            FROM curriculum_classes
            WHERE track = ? AND (level = ? OR level = ?) AND class_id = ?
        """, (track_norm, level_norm, level_norm.replace("+", "PLUS"), cid_norm))
        row = cursor.fetchone()
        if row:
            mod_meta = get_module_from_db(track_norm, level_norm)
            total = len(mod_meta.get("classes", [])) if mod_meta else 0
            return {
                "track": row["track"],
                "level": row["level"],
                "class_id": row["class_id"],
                "class_index": row["class_index"],
                "class": json.loads(row["class_json"]),
                "total_classes": total,
                "level_meta": {
                    "title": mod_meta.get("title", f"{level_norm} Curriculum") if mod_meta else "",
                    "emoji": mod_meta.get("emoji", "📐") if mod_meta else "📐",
                    "count": total
                }
            }

        # 2. Number extraction match (e.g. "class02" -> 2 -> idx 1)
        import re
        digits = re.findall(r"\d+", cid_norm)
        if digits:
            num = int(digits[0])
            # Check 1-based index
            cursor.execute("""
                SELECT track, level, class_id, class_index, title, class_json
                FROM curriculum_classes
                WHERE track = ? AND (level = ? OR level = ?) AND (class_index = ? OR class_index = ?)
                ORDER BY class_index ASC
            """, (track_norm, level_norm, level_norm.replace("+", "PLUS"), num - 1, num))
            num_row = cursor.fetchone()
            if num_row:
                mod_meta = get_module_from_db(track_norm, level_norm)
                total = len(mod_meta.get("classes", [])) if mod_meta else 0
                return {
                    "track": num_row["track"],
                    "level": num_row["level"],
                    "class_id": num_row["class_id"],
                    "class_index": num_row["class_index"],
                    "class": json.loads(num_row["class_json"]),
                    "total_classes": total,
                    "level_meta": {
                        "title": mod_meta.get("title", f"{level_norm} Curriculum") if mod_meta else "",
                        "emoji": mod_meta.get("emoji", "📐") if mod_meta else "📐",
                        "count": total
                    }
                }

    return None


def list_curriculum_modules_from_db() -> List[Dict[str, Any]]:
    """Returns list of all available curriculum tracks and levels in DB."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT track, level, title, emoji, topic_count, updated_at
            FROM curriculum_modules
            ORDER BY track ASC, level ASC
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


# -------------------------------------------------------------------------
# User Profiles & Options Management
# -------------------------------------------------------------------------
def get_or_create_user(user_id: str = "guest", display_name: str = "Learner") -> Dict[str, Any]:
    """Retrieves or registers user in database with default preferences."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("""
                INSERT INTO users (user_id, display_name, email, role, preferences_json)
                VALUES (?, ?, ?, 'learner', '{}')
            """, (user_id, display_name, f"{user_id}@example.com" if user_id != "guest" else ""))
            conn.commit()
            return {
                "user_id": user_id,
                "display_name": display_name,
                "email": "",
                "role": "learner",
                "preferences": {}
            }
        data = dict(row)
        try:
            data["preferences"] = json.loads(data.get("preferences_json") or "{}")
        except Exception:
            data["preferences"] = {}
        return data


def update_user_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Updates user options and preferences in database."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (user_id, preferences_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                preferences_json = excluded.preferences_json,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, json.dumps(preferences, ensure_ascii=False)))
        conn.commit()
    return get_or_create_user(user_id)


# -------------------------------------------------------------------------
# Manual Account Creation & Authentication
# -------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Computes a SHA-256 hash with salt for secure password storage."""
    salt = "aiec_manual_auth_v1_salt_"
    import hashlib
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def create_account(name: str, phone: str, email: str, username: str, password: str) -> Dict[str, Any]:
    """Creates a manual learner account in SQLite database."""
    name_clean = (name or "").strip()
    phone_clean = (phone or "").strip()
    email_clean = (email or "").strip().lower()
    username_clean = (username or "").strip().lower()

    if not name_clean:
        raise ValueError("Full name is required.")
    if not email_clean or "@" not in email_clean:
        raise ValueError("A valid email address is required.")
    if not username_clean:
        raise ValueError("Username is required.")
    if len(password or "") < 4:
        raise ValueError("Password must be at least 4 characters.")

    pwd_hash = hash_password(password)

    with get_connection() as conn:
        cursor = conn.cursor()
        # Check if username or email exists
        cursor.execute("SELECT id FROM accounts WHERE username = ?", (username_clean,))
        if cursor.fetchone():
            raise ValueError(f"Username '{username_clean}' is already taken. Please choose another.")

        cursor.execute("SELECT id FROM accounts WHERE email = ?", (email_clean,))
        if cursor.fetchone():
            raise ValueError(f"An account with email '{email_clean}' already exists. Please sign in instead.")

        cursor.execute("""
            INSERT INTO accounts (name, phone, email, username, password_hash)
            VALUES (?, ?, ?, ?, ?)
        """, (name_clean, phone_clean, email_clean, username_clean, pwd_hash))

        # Also register in users table
        cursor.execute("""
            INSERT INTO users (user_id, display_name, email, role, preferences_json)
            VALUES (?, ?, ?, 'learner', '{}')
            ON CONFLICT(user_id) DO UPDATE SET
                display_name = excluded.display_name,
                email = excluded.email
        """, (username_clean, name_clean, email_clean))

        conn.commit()

    return {
        "id": username_clean,
        "name": name_clean,
        "phone": phone_clean,
        "email": email_clean,
        "username": username_clean
    }


def authenticate_account(username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """Validates login credentials against manual accounts."""
    identifier = (username_or_email or "").strip().lower()
    if not identifier or not password:
        return None

    pwd_hash = hash_password(password)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, phone, email, username
            FROM accounts
            WHERE (username = ? OR email = ?) AND password_hash = ?
        """, (identifier, identifier, pwd_hash))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


# Initialize DB and seed modules on load
init_db()
seed_curriculum_modules(force=False)
