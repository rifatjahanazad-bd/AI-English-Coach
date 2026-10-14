"""server.py - Entry point for AI English Coach FastAPI Application.

Structured Architecture:
All API logic, routers, schemas, and endpoints are modularized under `backend/api/`:
- `backend/api/config.py`: Environment configuration, paths, and settings
- `backend/api/models/schemas.py`: Pydantic models for type-safe validation
- `backend/api/routes/auth.py`: Learner authentication and profile preferences
- `backend/api/routes/modules.py`: Curriculum modules & exercises loaded from SQLite DB
- `backend/api/routes/chat.py`: AI personal tutor & mentor conversation
- `backend/api/routes/memes.py`: 1-meme-per-click generation, validation & pixel cropping
- `backend/api/routes/speaking.py`: Audio upload, loss-free compression & IELTS evaluation
- `backend/api/routes/goals.py`: Band targets, exam deadlines & daily study minutes
- `backend/api/routes/system.py`: Health check and path routing catalog
- `backend/api/app.py`: FastAPI app factory, middleware, static mounts & SPA routing

Curriculum & User Database:
- `backend/database/app.db`: SQLite database storing all modules, classes, scores, and goals
"""

from backend.api.app import app, create_app

__all__ = ["app", "create_app"]

if __name__ == "__main__":
    import os
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3000"))
    is_prod = os.getenv("ENV", "development").lower() == "production"
    debug_flag = os.getenv("DEBUG", "true" if not is_prod else "false").lower() in ("true", "1")
    reload_enabled = debug_flag and not is_prod

    uvicorn.run("backend.server:app", host=host, port=port, reload=reload_enabled)
