"""backend.api - Structured FastAPI Application Package for AI English Coach.

Modules:
- backend.api.config: Configuration, constants, and paths
- backend.api.models.schemas: Request & response Pydantic models
- backend.api.routes: Domain-separated route modules (auth, modules, chat, memes, speaking, goals, system)
- backend.api.app: FastAPI application factory, middleware, and route mounting
"""

from backend.api.app import app, create_app

__all__ = ["app", "create_app"]
