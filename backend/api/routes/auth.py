import re
from fastapi import APIRouter, HTTPException
from backend.database import db
from backend.api.models.schemas import UserPreferencesRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

USER_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.@]{1,128}$")


def _sanitize_user_id(uid: str) -> str:
    """Validates user_id to prevent injection or invalid identity manipulation."""
    clean_id = (uid or "").strip()
    if not clean_id or not USER_ID_REGEX.match(clean_id):
        return "guest"
    return clean_id


@router.get("/status")
def get_auth_status(user_id: str = "guest"):
    """Returns the current user session status and options."""
    valid_id = _sanitize_user_id(user_id)
    user = db.get_or_create_user(valid_id)
    return {
        "authenticated": True,
        "is_guest": valid_id == "guest",
        "user": user
    }


@router.get("/user/{user_id}")
def get_user_profile(user_id: str):
    """Retrieves learner profile and stored options from database."""
    valid_id = _sanitize_user_id(user_id)
    user = db.get_or_create_user(valid_id)
    return user


@router.post("/preferences")
def update_preferences(payload: UserPreferencesRequest):
    """Updates learner options, UI settings, and study preferences in database."""
    valid_id = _sanitize_user_id(payload.user_id)
    # Sanitize preferences: ensure preferences is a dict with max 50 keys and string/number/bool/list values
    raw_prefs = payload.preferences or {}
    if not isinstance(raw_prefs, dict):
        raise HTTPException(status_code=400, detail="Preferences must be a key-value dictionary.")
    
    clean_prefs = {str(k)[:64]: v for k, v in list(raw_prefs.items())[:50]}
    user = db.update_user_preferences(valid_id, clean_prefs)
    return {
        "status": "success",
        "user": user
    }


class RegisterRequest(UserPreferencesRequest.__base__):
    name: str
    phone: str = ""
    email: str
    username: str
    password: str


class LoginRequest(UserPreferencesRequest.__base__):
    username_or_email: str
    password: str


@router.post("/register")
def register_account(payload: RegisterRequest):
    """Creates a new user account with name, phone, email, username, and password."""
    try:
        user = db.create_account(
            name=payload.name,
            phone=payload.phone or "",
            email=payload.email,
            username=payload.username,
            password=payload.password
        )
        return {
            "status": "success",
            "message": "Account created successfully!",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login")
def login_account(payload: LoginRequest):
    """Authenticates a user with username/email and password."""
    user = db.authenticate_account(
        username_or_email=payload.username_or_email,
        password=payload.password
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")
    return {
        "status": "success",
        "message": "Signed in successfully!",
        "user": user
    }

