"""system.py - System health check, status, and API route catalog."""

import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from backend.database import db
from backend.api.config import MODULES_DIR

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health_check():
    """Returns database, curriculum seeding, and LLM configuration health status."""
    diag = db.get_db_diagnostics()
    return {
        "status": "healthy",
        "database": str(db.DB_PATH.exists()),
        "modules_dir": str(MODULES_DIR.exists()),
        "curriculum_modules": diag.get("curriculum_modules", 0),
        "curriculum_classes": diag.get("curriculum_classes", 0),
        "llm_key_configured": bool(
            os.environ.get("TOKENHARBOR_API_KEY")
            or os.environ.get("OPENROUTER_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
        ),
        "architecture": "modular_backend_api"
    }


@router.get("/llm-test")
def test_llm_status():
    """Live diagnostic endpoint that tests all LLM providers and returns exact errors/latencies."""
    import time
    from backend import chatbot

    results = {
        "env_keys": {
            "TOKENHARBOR_API_KEY_set": bool(os.environ.get("TOKENHARBOR_API_KEY")),
            "GEMINI_API_KEY_set": bool(os.environ.get("GEMINI_API_KEY")),
            "OPENROUTER_API_KEY_set": bool(os.environ.get("OPENROUTER_API_KEY")),
            "OPENAI_API_KEY_set": bool(os.environ.get("OPENAI_API_KEY")),
        },
        "tests": []
    }

    # 1. Test TokenHarbor (uses the same model rotation as the live chatbot)
    th_key = os.environ.get("TOKENHARBOR_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    for th_model in chatbot.TH_CHAT_MODELS:
        th_start = time.time()
        if not th_key:
            results["tests"].append({
                "provider": "TokenHarbor",
                "model": th_model,
                "status": "missing_key",
                "error_message": "TOKENHARBOR_API_KEY is not configured in this environment.",
                "latency_sec": 0.0
            })
            break
        try:
            from openai import OpenAI
            client = OpenAI(api_key=th_key, base_url="https://tokenharbor.ai/v1", timeout=8.0, max_retries=0)
            r = client.chat.completions.create(
                model=th_model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5
            )
            results["tests"].append({
                "provider": "TokenHarbor",
                "model": th_model,
                "status": "ok",
                "latency_sec": round(time.time() - th_start, 2),
                "preview": (r.choices[0].message.content or "").strip()
            })
            break
        except Exception as exc:
            results["tests"].append({
                "provider": "TokenHarbor",
                "model": th_model,
                "status": "error",
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "latency_sec": round(time.time() - th_start, 2)
            })

    # 2. Test Gemini if configured
    gem_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gem_key:
        gem_start = time.time()
        try:
            from google import genai
            g_client = genai.Client(api_key=gem_key)
            resp = g_client.models.generate_content(
                model="gemini-2.0-flash",
                contents="ping"
            )
            results["tests"].append({
                "provider": "GoogleGemini",
                "model": "gemini-2.0-flash",
                "status": "ok",
                "latency_sec": round(time.time() - gem_start, 2),
                "preview": (resp.text or "").strip()[:50]
            })
        except Exception as exc:
            results["tests"].append({
                "provider": "GoogleGemini",
                "model": "gemini-2.0-flash",
                "status": "error",
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "latency_sec": round(time.time() - gem_start, 2)
            })

    return results


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
def get_system_prompts(x_admin_key: Optional[str] = Header(None)):
    """
    Returns all centralized system prompts loaded from backend/prompt.txt.
    Protected in production: requires X-Admin-Key header matching ADMIN_API_KEY.
    """
    is_prod = os.getenv("ENV", "development").lower() == "production"
    admin_secret = os.getenv("ADMIN_API_KEY", "").strip()

    if is_prod:
        if not admin_secret or x_admin_key != admin_secret:
            raise HTTPException(
                status_code=403,
                detail="Access denied: System prompt inspection is disabled in production without admin credentials."
            )

    from backend.prompt_loader import load_all_prompts, PROMPT_FILE
    prompts = load_all_prompts(force_reload=True)
    return {
        "prompt_file": PROMPT_FILE.name if is_prod else str(PROMPT_FILE),
        "sections": list(prompts.keys()),
        "prompts": prompts
    }

