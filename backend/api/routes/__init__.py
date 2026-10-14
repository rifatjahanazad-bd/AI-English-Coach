"""routes package - Aggregates modular domain routers."""

from fastapi import FastAPI
from backend.api.routes.auth import router as auth_router
from backend.api.routes.modules import router as modules_router
from backend.api.routes.chat import router as chat_router
from backend.api.routes.memes import router as memes_router
from backend.api.routes.speaking import router as speaking_router
from backend.api.routes.goals import router as goals_router
from backend.api.routes.scoring import router as scoring_router
from backend.api.routes.system import router as system_router


def register_routes(app: FastAPI) -> None:
    """Registers all domain routers into the FastAPI application instance."""
    app.include_router(system_router)
    app.include_router(auth_router)
    app.include_router(modules_router)
    app.include_router(chat_router)
    app.include_router(memes_router)
    app.include_router(speaking_router)
    app.include_router(goals_router)
    app.include_router(scoring_router)

