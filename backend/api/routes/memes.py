"""memes.py - AI English meme generation, validation, cropping, and rate limits."""

import random
from datetime import datetime
from fastapi import APIRouter, HTTPException
import requests

from backend.database import db
from backend.meme_generator import meme_generator
from backend.meme_generator.meme_validator import validate_meme_image
from backend.meme_generator.meme_crop import crop_meme_image
from backend.api.config import MEMES_OUTPUT_DIR
from backend.api.models.schemas import MemeRequest

router = APIRouter(prefix="/api/meme", tags=["memes"])


@router.get("/status")
def get_meme_status(user_id: str = "guest"):
    """Returns today's usage count, daily limit (15), remaining count, and cooldown timer."""
    return db.get_meme_rate_status(user_id)


@router.post("/generate")
def create_meme(payload: MemeRequest):
    """
    Generates 1 meme per click, validates background quality,
    filters out striped placeholders, crops watermark margins in pixels,
    and enforces the 15/day quota and 30-min cooldown.
    """
    status = db.get_meme_rate_status(payload.user_id)

    # 1. Enforce 30-min cooldown
    if status["in_cooldown"]:
        secs = status["cooldown_remaining_seconds"]
        mins = max(1, round(secs / 60))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "cooldown_active",
                "message": f"Cooldown active: You created 3 memes. Please wait {mins} minute{'s' if mins != 1 else ''} before creating again.",
                "remaining_seconds": secs,
                "status": status,
            },
        )

    # 2. Enforce 15 memes per day quota
    if status["remaining_today"] <= 0:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "daily_limit_reached",
                "message": "Daily limit reached: You have created all 15 memes for today. Come back tomorrow!",
                "status": status,
            },
        )

    # 3. Always enforce 1 meme per click as requested
    count = 1

    # 4. Generate concept using MIMO or fallback
    try:
        concepts = meme_generator.generate_batch_meme_concepts(count=count, topic=payload.topic)
    except Exception:
        selected = random.sample(meme_generator.FALLBACK_MEMES, 1)
        concepts = [dict(m) for m in selected]

    if not concepts:
        concepts = [dict(random.choice(meme_generator.FALLBACK_MEMES))]

    concept = concepts[0]

    # 5. Validate meme template & download background with high efficiency
    template = meme_generator.sanitize_template(concept.get("template", "drake"))
    top_text = concept.get("top_text", "")
    bottom_text = concept.get("bottom_text", "")

    # Fast 2-step check: try primary template first, then at most 1 verified fallback
    primary_cand = template
    secondary_cand = "drake" if template != "drake" else "fry"
    candidates = [primary_cand, secondary_cand]

    valid_image_bytes = None
    chosen_template = primary_cand

    session = requests.Session()
    for cand in candidates:
        top_enc = meme_generator.sanitize_memegen_text(top_text)
        bot_enc = meme_generator.sanitize_memegen_text(bottom_text)
        api_url = f"https://api.memegen.link/images/{cand}/{top_enc}/{bot_enc}.png"

        try:
            resp = session.get(api_url, timeout=5.0)
            if resp.status_code == 200 and len(resp.content) > 10000:
                is_valid, reason = validate_meme_image(resp.content)
                if is_valid:
                    valid_image_bytes = resp.content
                    chosen_template = cand
                    break
        except Exception:
            continue

    # 6. Save image to disk and apply pixel cropping via meme_crop.py
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"meme_{chosen_template}_{timestamp}.png"
    filepath = MEMES_OUTPUT_DIR / filename

    if valid_image_bytes:
        with open(filepath, "wb") as f:
            f.write(valid_image_bytes)
        # Apply pixel-based cropping to remove watermark / footer
        crop_meme_image(
            image_input=filepath,
            top_px=payload.top_px,
            bottom_px=payload.bottom_px,
            left_px=payload.left_px,
            right_px=payload.right_px,
            output_path=filepath,
        )
    else:
        # Fallback to local photographic template (guarantees real background image)
        concept["template"] = chosen_template
        meme_generator.create_local_fallback_image(concept, filepath)

    # Double check final image quality & filter out any non-background image
    is_final_valid, reason = validate_meme_image(filepath)
    if not is_final_valid:
        # Re-render onto guaranteed local Drake or Fry template
        concept["template"] = "drake"
        meme_generator.create_local_fallback_image(concept, filepath)

    image_url = f"/output/memes/{filename}"

    memes = [
        {
            "template": chosen_template,
            "top_text": top_text,
            "bottom_text": bottom_text,
            "topic": concept.get("topic", payload.topic),
            "joke": concept.get("joke", ""),
            "image_url": image_url,
        }
    ]

    # 7. Record single meme generation in DB
    stats = db.record_meme_batch(payload.user_id, memes)

    return {
        "success": True,
        "memes": memes,
        "count": 1,
        "stats": stats,
    }
