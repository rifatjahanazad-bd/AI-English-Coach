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
        redirect_slashes=False,
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
            "default-src 'self' https: http: data: blob:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net; "
            "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://tokenharbor.ai https: ws: wss:; "
            "img-src 'self' data: blob: https:; "
            "media-src 'self' blob: data: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' data: https://fonts.gstatic.com;"
        )
        return response

    # 1c. Vercel Serverless Path Normalization Middleware
    @application.middleware("http")
    async def normalize_api_path(request: Request, call_next):
        """Ensures request.scope['path'] matches the target FastAPI route under all serverless rewrites."""
        query_path = request.query_params.get("__path__")
        if query_path:
            clean_subpath = query_path.strip().lstrip("/")
            request.scope["path"] = f"/api/{clean_subpath}" if clean_subpath else "/api"
            return await call_next(request)

        raw_path = request.scope.get("path", "")
        # Do not rewrite client SPA routes on GET / HEAD requests
        spa_page_routes = {"/", "/dashboard", "/home", "/personalmentor", "/goal", "/speaking", "/test", "/practice", "/game"}
        if request.method in ("GET", "HEAD") and (
            raw_path in spa_page_routes
            or raw_path.startswith("/test/")
            or raw_path.startswith("/practice/")
        ):
            request.scope["path"] = raw_path
            return await call_next(request)

        # Strip any serverless handler prefixes (e.g. /api/index.py, /index.py)
        for prefix in ("/api/index.py", "api/index.py", "/index.py", "index.py"):
            if raw_path.startswith(prefix):
                raw_path = raw_path[len(prefix):]
                break

        if not raw_path.startswith("/"):
            raw_path = f"/{raw_path}"

        api_prefixes = (
            "/chat", "/speaking", "/modules", "/meme",
            "/auth", "/goal", "/scoring", "/health", "/system", "/scores", "/progress"
        )
        if any(raw_path == p or raw_path.startswith(f"{p}/") for p in api_prefixes):
            if not raw_path.startswith("/api"):
                raw_path = f"/api{raw_path}"

        request.scope["path"] = raw_path
        return await call_next(request)

    # 2. Register all structured API domain routers
    register_routes(application)

    def serve_spa(full_path: Optional[str] = None):
        """Serves the single-page application index.html for all client-side navigation paths."""
        if INDEX_HTML.exists():
            return FileResponse(str(INDEX_HTML))
        raise HTTPException(status_code=404, detail="UI index.html not found")

    def serve_game():
        """Serves the Fast Phrases game index.html."""
        game_index = GAME_DIR / "index.html"
        if game_index.exists():
            return FileResponse(str(game_index))
        raise HTTPException(status_code=404, detail="Game index.html not found")

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

    application.add_api_route("/game", serve_game, methods=["GET", "HEAD"])
    application.add_api_route("/game/", serve_game, methods=["GET", "HEAD"])

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
