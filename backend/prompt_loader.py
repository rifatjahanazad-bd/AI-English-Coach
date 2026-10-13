"""prompt_loader.py - Dynamic loader for system prompts from backend/prompt.txt.

Reads and caches system prompts by section headers [SECTION_NAME].
Automatically reloads when backend/prompt.txt is modified so developers
and users can tweak prompt instructions and output formats in real time.
"""

import os
import re
from pathlib import Path
from typing import Dict, Optional

PROMPT_FILE = Path(__file__).resolve().parent / "prompt.txt"

_CACHED_PROMPTS: Dict[str, str] = {}
_LAST_MTIME: float = 0.0


def load_all_prompts(force_reload: bool = False) -> Dict[str, str]:
    """
    Parses backend/prompt.txt into a dictionary mapping section names to prompt text.
    Re-reads from disk only if file mtime changed or force_reload is True.
    """
    global _CACHED_PROMPTS, _LAST_MTIME

    if not PROMPT_FILE.exists():
        return _CACHED_PROMPTS

    try:
        current_mtime = os.path.getmtime(PROMPT_FILE)
    except OSError:
        return _CACHED_PROMPTS

    if not force_reload and _CACHED_PROMPTS and current_mtime == _LAST_MTIME:
        return _CACHED_PROMPTS

    prompts: Dict[str, str] = {}
    try:
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse sections separated by [SECTION_NAME]
        pattern = r"\[([A-Z0-9_]+)\]\s*\n(.*?)(?=\n\[[A-Z0-9_]+\]|\Z)"
        matches = re.findall(pattern, content, flags=re.DOTALL)

        for name, text in matches:
            prompts[name.strip()] = text.strip()

        _CACHED_PROMPTS = prompts
        _LAST_MTIME = current_mtime
    except Exception as e:
        print(f"⚠️ [PromptLoader] Error reading {PROMPT_FILE}: {e}")

    return _CACHED_PROMPTS


def get_prompt(section_name: str, default: Optional[str] = None) -> str:
    """Retrieves a specific system prompt by section name."""
    all_prompts = load_all_prompts()
    val = all_prompts.get(section_name.strip())
    if val:
        return val
    return default or ""


def get_ielts_coach_prompt(default: Optional[str] = None) -> str:
    """Returns the tutor system prompt for the AI Coach chatbot."""
    return get_prompt("IELTS_COACH_PROMPT", default)


def get_speaking_evaluator_prompt(default: Optional[str] = None) -> str:
    """Returns the evaluator system prompt for speaking assessment."""
    return get_prompt("SPEAKING_EVALUATOR_PROMPT", default)


def get_meme_concept_prompt(topic_prompt: str, templates_list: str) -> str:
    """Returns single meme generation prompt formatted with topic and templates."""
    raw = get_prompt("MEME_CONCEPT_PROMPT")
    if not raw:
        raw = (
            "You are a creative humor writer specializing in relatable English learning and IELTS memes.\n"
            "Generate a funny, high-impact meme concept {topic_prompt}.\n\n"
            "Rules:\n1. 'template' MUST be chosen from one of these exact keys: [{templates_list}]\n"
            "2. 'top_text' and 'bottom_text' must each be punchy and SHORT (max 7-9 words each).\n"
            "3. Do not use special characters or punctuation in top_text/bottom_text.\n"
            "4. Output strictly valid JSON with no markdown wrapping.\n"
        )
    return raw.replace("{topic_prompt}", topic_prompt).replace("{templates_list}", templates_list)


def get_meme_batch_prompt(count: int, topic_prompt: str, templates_list: str) -> str:
    """Returns batch meme generation prompt formatted with count, topic and templates."""
    raw = get_prompt("MEME_BATCH_PROMPT")
    if not raw:
        raw = (
            "You are a creative humor writer specializing in relatable English learning and IELTS memes.\n"
            "Generate exactly {count} distinct, hilarious, high-impact meme concepts {topic_prompt}.\n\n"
            "Rules:\n1. 'template' MUST be chosen from one of these exact keys: [{templates_list}]\n"
            "2. 'top_text' and 'bottom_text' must each be punchy and SHORT (max 7-9 words each).\n"
            "3. Output strictly a JSON array of {count} objects, with no markdown wrapping.\n"
        )
    return (
        raw.replace("{count}", str(count))
        .replace("{topic_prompt}", topic_prompt)
        .replace("{templates_list}", templates_list)
    )
