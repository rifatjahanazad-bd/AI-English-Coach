"""system.py - System health check, status, and API route catalog."""

from fastapi import APIRouter
from backend.database import db
from backend.api.config import MODULES_DIR

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health_check():
    """Returns database and module directories health status."""
    return {
        "status": "healthy",
        "database": str(db.DB_PATH.exists()),
        "modules_dir": str(MODULES_DIR.exists()),
        "architecture": "modular_backend_api"
    }


@router.get("/routes")
def get_api_routes():
    """
    Returns full catalog of frontend application routes, path parameters,
    and their matching backend API endpoints.
    """
    return {
        "routes": [
            {
                "path": "/home",
                "name": "Home Dashboard",
                "section": "chat",
                "description": "App overview and conversational tutor",
                "api": "/api/health"
            },
            {
                "path": "/personalmentor",
                "name": "AI Personal Mentor",
                "section": "chat",
                "description": "Personal AI English coach interactive dialogue",
                "api": "/api/chat"
            },
            {
                "path": "/goal",
                "name": "Goal & Speaking Targets",
                "section": "test",
                "description": "Personal target band score, deadline, and study targets",
                "api": "/api/goal/{user_id}"
            },
            {
                "path": "/test",
                "name": "Speaking Test Arena",
                "section": "test",
                "description": "IELTS speaking test topic selection",
                "api": "/api/speaking/topics"
            },
            {
                "path": "/test/{topic_id}",
                "name": "Speaking Test Simulation",
                "section": "test",
                "params": ["topic_id"],
                "description": "Live voice test on selected topic",
                "api": "/api/speaking/topic/{topic_id}"
            },
            {
                "path": "/practice",
                "name": "Practice Arena",
                "section": "practice",
                "description": "Category tracks: Grammar, Vocabulary, Listening, Writing",
                "api": "/api/modules/{track}/{level}"
            },
            {
                "path": "/practice/{track}",
                "name": "Practice Track",
                "section": "practice",
                "params": ["track"],
                "description": "Level selection for specified track (e.g. grammar)",
                "api": "/api/modules/{track}/A1"
            },
            {
                "path": "/practice/{track}/{level}",
                "name": "Level Syllabus Grid",
                "section": "practice",
                "params": ["track", "level"],
                "description": "Collage grid of classes for CEFR level (e.g. grammar/a1)",
                "api": "/api/modules/{track}/{level}"
            },
            {
                "path": "/practice/{track}/{level}/{class_id}",
                "name": "Class Quiz & Drill",
                "section": "practice",
                "params": ["track", "level", "class_id"],
                "description": "Interactive question quiz for class (e.g. grammar/a1/class02)",
                "api": "/api/modules/{track}/{level}/{class_id}"
            }
        ]
    }


@router.get("/prompts")
def get_system_prompts():
    """
    Returns all centralized system prompts currently loaded from backend/prompt.txt,
    allowing the developer or app to inspect and verify active prompts.
    """
    from backend.prompt_loader import load_all_prompts, PROMPT_FILE
    prompts = load_all_prompts(force_reload=True)
    return {
        "prompt_file": str(PROMPT_FILE),
        "sections": list(prompts.keys()),
        "prompts": prompts
    }

