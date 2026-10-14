"""app.py - FastAPI Application Factory and Root Setup for AI English Coach.

Structured according to modern Python backend architecture:
- CORS middleware
- Domain routers (/api/modules, /api/auth, /api/chat, /api/meme, /api/speaking, /api/goal)
- SPA fallback routes
- Static directory mounts
"""

from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.config import (
    CORS_ORIGINS,
    INDEX_HTML,
    REPO_ROOT,
    MEMES_OUTPUT_DIR,
    GAME_DIR,
)
from backend.api.routes import register_routes


def create_app() -> FastAPI:
    """Creates and configures the FastAPI application instance."""
    application = FastAPI(
        title="AI English Coach API",
        description="Structured modular backend API for AI English Coach, IELTS preparation, and speaking evaluation",
        version="2.0.0",
    )

    # 1. CORS Middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 1b. Defensive Security Headers Middleware
    @application.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com https://apis.google.com; "
            "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; "
            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://tokenharbor.ai; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' data: https://fonts.gstatic.com;"
        )
        return response

    # 2. Register all structured API domain routers
    register_routes(application)

    def serve_spa(full_path: Optional[str] = None):
        """Serves the single-page application index.html for all client-side navigation paths."""
        if INDEX_HTML.exists():
            return FileResponse(str(INDEX_HTML))
        raise HTTPException(status_code=404, detail="UI index.html not found")

    spa_paths = [
        "/",
        "/dashboard",
        "/home",
        "/personalmentor",
        "/goal",
        "/speaking",
        "/speaking/{full_path:path}",
        "/test",
        "/test/{full_path:path}",
        "/practice",
        "/practice/{full_path:path}",
    ]
    for path in spa_paths:
        application.add_api_route(path, serve_spa, methods=["GET", "HEAD"])

    # 4. Mount Static Directories for web client assets
    ui_dir = REPO_ROOT / "UI"
    if (ui_dir / "js").exists():
        application.mount("/js", StaticFiles(directory=str(ui_dir / "js")), name="js")
    if (ui_dir / "css").exists():
        application.mount("/css", StaticFiles(directory=str(ui_dir / "css")), name="css")
    if (ui_dir / "modules").exists():
        application.mount("/modules", StaticFiles(directory=str(ui_dir / "modules")), name="modules")
    if ui_dir.exists():
        application.mount("/UI", StaticFiles(directory=str(ui_dir), html=True), name="ui")
    if GAME_DIR.exists():
        application.mount("/game", StaticFiles(directory=str(GAME_DIR), html=True), name="game")
        application.mount("/backend/game", StaticFiles(directory=str(GAME_DIR), html=True), name="backend_game")
    if MEMES_OUTPUT_DIR.exists():
        application.mount("/output/memes", StaticFiles(directory=str(MEMES_OUTPUT_DIR)), name="memes")

    return application


# Global application instance
app = create_app()
