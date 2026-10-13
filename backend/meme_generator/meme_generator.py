"""meme_generator.py - AI English Learning & IELTS Meme Generator.

Generates hilarious, relatable memes for English learners using the
MIMO model (mimo-v2.6-flash:free) via TokenHarbor / OpenRouter,
paired with automated meme image generation and rich local card rendering.
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import textwrap
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont

# -------------------------------------------------------------------------
# Environment & Configuration
# -------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1] if len(SCRIPT_DIR.parents) >= 2 else SCRIPT_DIR.parent

for candidate_env in [
    SCRIPT_DIR / ".env",
    SCRIPT_DIR.parent / ".env",
    REPO_ROOT / ".env",
]:
    if candidate_env.exists():
        load_dotenv(candidate_env)
        break
else:
    load_dotenv()

TOKENHARBOR_API_KEY = os.getenv("TOKENHARBOR_API_KEY") or os.getenv("OPENROUTER_API_KEY")
BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://tokenharbor.ai/v1")
DEFAULT_MODEL = os.getenv("MODEL_NAME", "mimo-v2.6-flash:free")

OUTPUT_DIR = REPO_ROOT / "output" / "memes"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 100% Verified memegen.link template identifiers (tested against api.memegen.link/templates)
MEME_TEMPLATES = [
    "drake",
    "db",            # Distracted Boyfriend
    "doge",
    "fine",          # This is fine (dog in fire)
    "buzz",          # Buzz Lightyear everywhere
    "fry",           # Futurama Fry skeptical
    "success",       # Success kid
    "spongebob",     # Mocking Spongebob
    "rollsafe",      # Roll Safe smart guy tapping head
    "disastergirl",  # Disaster girl smiling
    "afraid",        # Andy Dwyer too afraid to ask
    "gru",           # Gru's plan
    "wonka",         # Condescending Wonka
    "pigeon",        # Is this a pigeon?
    "yodawg",        # Xzibit Yo Dawg
    "grumpycat",     # Grumpy cat
    "leo",           # Leonardo DiCaprio laughing/toast
    "awkward",       # Awkward seal
    "both",          # Why not both?
]

TEMPLATE_ALIASES = {
    "distracted": "db",
    "sponge": "spongebob",
    "spongbob": "spongebob",
    "clown": "rollsafe",
    "grim": "fine",
    "think": "rollsafe",
    "batman": "drake",
    "yoda": "wonka",
    "grumpy": "grumpycat",
    "expanding": "gru",
    "patrick": "spongebob",
    "picard": "fry",
    "dog": "doge",
}

def sanitize_template(template_name: Optional[str]) -> str:
    """Ensures template is a 100% verified memegen.link template to avoid gray placeholder stripes."""
    if not template_name:
        return "drake"
    clean = str(template_name).strip().lower()
    clean = TEMPLATE_ALIASES.get(clean, clean)
    if clean in MEME_TEMPLATES:
        return clean
    # Fallback to a guaranteed working template
    return "drake"

# Curated offline fallback memes in case of network or API key issues
# Every single template here is verified on api.memegen.link
FALLBACK_MEMES = [
    {
        "template": "drake",
        "top_text": "Using common everyday words",
        "bottom_text": "Using convoluted Band 9 collocations",
        "topic": "IELTS Vocabulary",
        "joke": "Why say 'I am tired' when you can say 'I am utterly fatigued by mundane exertion'?",
    },
    {
        "template": "fry",
        "top_text": "Not sure if native speaker",
        "bottom_text": "Or just speaking really fast with slang",
        "topic": "Listening Comprehension",
        "joke": "When they drop all the consonants and you question your whole English degree.",
    },
    {
        "template": "rollsafe",
        "top_text": "Can't make grammar mistakes",
        "bottom_text": "If you only speak in one-word answers",
        "topic": "Speaking Strategy",
        "joke": "Examiner: Describe your hometown. Me: Yes.",
    },
    {
        "template": "spongebob",
        "top_text": "Me writing: Henceforth furthermore nevertheless",
        "bottom_text": "My actual essay content: Dogs are cute",
        "topic": "IELTS Writing Task 2",
        "joke": "Linking words won't save a 20-word argument, but we try anyway.",
    },
    {
        "template": "doge",
        "top_text": "much IELTS very band 9",
        "bottom_text": "such lexical resource wow",
        "topic": "Vocabulary Flex",
        "joke": "Throwing fancy words into casual conversation like confetti.",
    },
    {
        "template": "disastergirl",
        "top_text": "Me forgetting third-person -s in present simple",
        "bottom_text": "My English teacher watching in agony",
        "topic": "A1 Grammar Trap",
        "joke": "'He go to school' gives your teacher physical chills.",
    },
    {
        "template": "fine",
        "top_text": "Examiner: Describe a book that influenced you",
        "bottom_text": "Me who has not read a book since 2018: This is fine",
        "topic": "Speaking Part 2",
        "joke": "Time to invent an award-winning novel in 60 seconds.",
    },
    {
        "template": "buzz",
        "top_text": "Prepositions",
        "bottom_text": "Irregular prepositions everywhere",
        "topic": "Prepositions",
        "joke": "In time? On time? At time? Why must time have three different addresses?",
    },
    {
        "template": "db",
        "top_text": "Me trying to master past perfect",
        "bottom_text": "Phrasal verbs with 14 different meanings",
        "topic": "Grammar Distractions",
        "joke": "'Turn up', 'turn down', 'turn off', 'turn on'... please make it stop!",
    },
    {
        "template": "grumpycat",
        "top_text": "Did you enjoy the IELTS listening section?",
        "bottom_text": "The Australian accent ruined my life",
        "topic": "IELTS Listening",
        "joke": "When the recording has background rain and Australian cricket commentary.",
    },
    {
        "template": "success",
        "top_text": "Used 'In spite of the fact that' correctly",
        "bottom_text": "On my first attempt in IELTS speaking",
        "topic": "Grammar Victory",
        "joke": "Examiner's eyebrows visibly lifted half an inch.",
    },
    {
        "template": "wonka",
        "top_text": "Please tell me more",
        "bottom_text": "About how watching movies without subtitles made you fluent",
        "topic": "Learning Myths",
        "joke": "Passive watching isn't quite the same as active grammar drills.",
    },
    {
        "template": "gru",
        "top_text": "Study 50 grammar rules",
        "bottom_text": "Forget every single one when examiner says hello",
        "topic": "Exam Panic",
        "joke": "Wait... what was my name in the present perfect tense again?",
    },
    {
        "template": "afraid",
        "top_text": "I do not know the difference between who and whom",
        "bottom_text": "And at this point I am too afraid to ask",
        "topic": "Grammar Uncertainty",
        "joke": "Just use 'who' and speak quickly before anyone notices.",
    },
    {
        "template": "pigeon",
        "top_text": "Any word with more than 3 syllables",
        "bottom_text": "Is this a Band 9 idiom?",
        "topic": "Lexical Resource",
        "joke": "Replacing 'good' with 'pulchritudinous' doesn't always guarantee a 9.",
    }
]


# -------------------------------------------------------------------------
# Typography Helper
# -------------------------------------------------------------------------
def get_font(size: int, prefer_impact: bool = False) -> ImageFont.ImageFont:
    """Finds best available system font on macOS/Linux/Windows or falls back to default."""
    candidates = []
    if prefer_impact:
        candidates += [
            "/System/Library/Fonts/Supplemental/Impact.ttf",
            "/Library/Fonts/Impact.ttf",
            "C:\\Windows\\Fonts\\impact.ttf",
            "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFCompact.ttf",
        "/Library/Fonts/Arial.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    return ImageFont.load_default()


# -------------------------------------------------------------------------
# LLM AI Meme Concept Generator
# -------------------------------------------------------------------------
def get_ai_client() -> Optional[OpenAI]:
    """Initializes OpenAI client with TokenHarbor or OpenRouter credentials."""
    if not TOKENHARBOR_API_KEY:
        return None
    return OpenAI(api_key=TOKENHARBOR_API_KEY, base_url=BASE_URL)


def generate_meme_concept_with_mimo(
    topic: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> Dict[str, str]:
    """Uses the MIMO / Open LLM to generate a relatable English learning meme idea."""
    client = get_ai_client()

    if not client:
        print("  ⚠️  [Notice] TOKENHARBOR_API_KEY not found. Using offline curated meme.")
        return random.choice(FALLBACK_MEMES)

    templates_list = ", ".join(MEME_TEMPLATES)
    topic_prompt = (
        f"specifically about '{topic}'"
        if topic
        else "about English grammar, IELTS preparation, strange English idioms, or funny learner mistakes"
    )

    prompt = f"""You are a creative humor writer specializing in relatable English learning and IELTS memes.
Generate a funny, high-impact meme concept {topic_prompt}.

Rules:
1. 'template' MUST be chosen from one of these exact keys: [{templates_list}]
2. 'top_text' and 'bottom_text' must each be punchy and SHORT (max 7-9 words each).
3. Do not use special characters or punctuation in top_text/bottom_text like slashes or quotes.
4. Output strictly valid JSON with no markdown wrapping.

Format:
{{
  "template": "template_name",
  "top_text": "Punchy top text",
  "bottom_text": "Punchy bottom text",
  "topic": "Short Topic name",
  "joke": "A witty one-line takeaway or explanation"
}}
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You output only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.85,
            max_tokens=250,
        )

        content = response.choices[0].message.content or ""
        cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)

        data = json.loads(cleaned)

        if not all(k in data for k in ("template", "top_text", "bottom_text")):
            raise ValueError("Missing required fields in model response.")

        data["template"] = sanitize_template(data.get("template"))
        return data

    except Exception as e:
        return random.choice(FALLBACK_MEMES)


def generate_meme_concept(topic: Optional[str] = None) -> Dict[str, str]:
    """Convenience alias for single meme concept generation."""
    return generate_meme_concept_with_mimo(topic=topic)


def generate_batch_meme_concepts(
    count: int = 3,
    topic: Optional[str] = None,
    model: str = DEFAULT_MODEL
) -> List[Dict[str, Any]]:
    """Generates a batch of distinct, hilarious English learning memes (up to `count`)."""
    count = max(1, min(count, 5))
    client = get_ai_client()

    if not client:
        selected = random.sample(FALLBACK_MEMES, min(count, len(FALLBACK_MEMES)))
        return [dict(m) for m in selected]

    templates_list = ", ".join(MEME_TEMPLATES)
    topic_prompt = (
        f"specifically about '{topic}'"
        if topic
        else "about English grammar traps, IELTS Speaking/Writing, tricky prepositions, or funny learner mistakes"
    )

    prompt = f"""You are a creative humor writer specializing in relatable English learning and IELTS memes.
Generate exactly {count} distinct, hilarious, high-impact meme concepts {topic_prompt}.
Make sure each meme uses a DIFFERENT template and focuses on a different angle or joke!

Rules:
1. 'template' MUST be chosen from one of these exact keys: [{templates_list}]
2. 'top_text' and 'bottom_text' must each be punchy and SHORT (max 7-9 words each).
3. Do not use special characters or punctuation like slashes or quotes.
4. Output strictly a JSON array of {count} objects, with no markdown wrapping.

Format:
[
  {{
    "template": "template_name",
    "top_text": "Punchy top text",
    "bottom_text": "Punchy bottom text",
    "topic": "Short Topic name",
    "joke": "A witty one-line takeaway or explanation"
  }}
]
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You output only a valid JSON array of objects."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.88,
            max_tokens=600,
        )

        content = response.choices[0].message.content or ""
        cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)

        data = json.loads(cleaned)
        if isinstance(data, list) and len(data) > 0:
            results = []
            for item in data[:count]:
                if all(k in item for k in ("template", "top_text", "bottom_text")):
                    item["template"] = sanitize_template(item.get("template"))
                    results.append(item)
            if len(results) >= count:
                return results

    except Exception as e:
        print(f"  ⚠️  [LLM Batch Error: {e}]. Falling back to curated catalog.")

    selected = random.sample(FALLBACK_MEMES, min(count, len(FALLBACK_MEMES)))
    return [dict(m) for m in selected]



# -------------------------------------------------------------------------
# Meme Image Rendering
# -------------------------------------------------------------------------
def sanitize_memegen_text(text: str) -> str:
    """Sanitizes text according to memegen.link escaping rules."""
    if not text:
        return "_"

    t = text.strip()
    t = t.replace("_", "__")
    t = t.replace("-", "--")
    t = t.replace("?", "~q")
    t = t.replace("%", "~p")
    t = t.replace("#", "~h")
    t = t.replace("/", "~s")
    t = t.replace('"', "''")
    t = t.replace(" ", "_")
    return urllib.parse.quote(t, safe="~_")


def create_local_fallback_image(meme_data: Dict[str, str], filepath: Path) -> Path:
    """Creates a high-resolution, styled meme card with Pillow."""
    width, height = 800, 800
    img = Image.new("RGB", (width, height), color=(20, 21, 31))
    draw = ImageDraw.Draw(img)

    # Fonts
    title_font = get_font(22, prefer_impact=False)
    label_font = get_font(20, prefer_impact=False)
    impact_font = get_font(34, prefer_impact=True)
    joke_font = get_font(20, prefer_impact=False)

    # Gradient header bar
    draw.rectangle([(0, 0), (width, 85)], fill=(79, 70, 229))

    # Header title
    topic = meme_data.get("topic", "English Learning Meme").upper()
    template = meme_data.get("template", "meme").upper()
    draw.text((30, 30), f"AI ENGLISH COACH  ·  {topic}", font=title_font, fill=(255, 255, 255))
    draw.text((width - 180, 32), f"[{template}]", font=title_font, fill=(216, 180, 254))

    # Outer card
    draw.rounded_rectangle(
        [(30, 115), (width - 30, height - 30)],
        radius=18,
        fill=(31, 33, 49),
        outline=(99, 102, 241),
        width=2,
    )

    top_text = meme_data.get("top_text", "").upper()
    bottom_text = meme_data.get("bottom_text", "").upper()
    joke = meme_data.get("joke", "")

    # Top Block (Expectation / Setup)
    draw.rounded_rectangle([(60, 145), (width - 60, 335)], radius=12, fill=(42, 45, 68))
    draw.text((85, 165), "SETUP / EXPECTATION", font=label_font, fill=(165, 180, 252))
    
    top_lines = textwrap.wrap(top_text, width=28)
    curr_y = 210
    for line in top_lines[:3]:
        draw.text((85, curr_y), line, font=impact_font, fill=(255, 255, 255))
        curr_y += 42

    # Bottom Block (Reality / Punchline)
    draw.rounded_rectangle([(60, 365), (width - 60, 565)], radius=12, fill=(49, 36, 68))
    draw.text((85, 385), "REALITY / REACTION", font=label_font, fill=(244, 114, 182))

    bottom_lines = textwrap.wrap(bottom_text, width=28)
    curr_y = 430
    for line in bottom_lines[:3]:
        draw.text((85, curr_y), line, font=impact_font, fill=(253, 224, 71))
        curr_y += 42

    # Bottom Quote Pill
    if joke:
        draw.rounded_rectangle([(60, 600), (width - 60, 740)], radius=12, fill=(24, 24, 37), outline=(67, 56, 202), width=1)
        draw.text((85, 620), "TAKEAWAY:", font=label_font, fill=(129, 140, 248))
        joke_lines = textwrap.wrap(joke, width=54)
        curr_y = 655
        for line in joke_lines[:2]:
            draw.text((85, curr_y), line, font=joke_font, fill=(224, 231, 255))
            curr_y += 28

    img.save(filepath, format="PNG")
    return filepath


def download_or_render_meme(
    meme_data: Dict[str, str],
    crop_bottom_px: int = 14,
    crop_top_px: int = 0,
    crop_left_px: int = 0,
    crop_right_px: int = 0,
) -> Path:
    """
    Fetches the meme image from memegen API, validates that it is NOT a striped placeholder,
    regenerates if defective, crops external watermarks by pixel offsets, and saves locally.
    """
    from backend.meme_generator.meme_validator import validate_meme_image
    from backend.meme_generator.meme_crop import crop_meme_image

    template = sanitize_template(meme_data.get("template", "drake"))
    top_enc = sanitize_memegen_text(meme_data.get("top_text", ""))
    bottom_enc = sanitize_memegen_text(meme_data.get("bottom_text", ""))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"meme_{template}_{timestamp}.png"
    filepath = OUTPUT_DIR / filename

    # Attempt fetching with validation and automatic fallback
    candidate_templates = [template] + [t for t in ["drake", "fry", "spongebob", "fine", "doge"] if t != template]
    image_bytes = None

    for cand in candidate_templates:
        cand_url = f"https://api.memegen.link/images/{cand}/{top_enc}/{bottom_enc}.png"
        try:
            resp = requests.get(cand_url, timeout=4)
            if resp.status_code == 200 and len(resp.content) > 1000:
                is_valid, reason = validate_meme_image(resp.content)
                if is_valid:
                    image_bytes = resp.content
                    meme_data["template"] = cand
                    break
                else:
                    print(f"  ⚠️  [Meme Validator Rejected {cand}]: {reason}. Retrying next template...")
        except Exception:
            continue

    if image_bytes:
        with open(filepath, "wb") as f:
            f.write(image_bytes)
    else:
        create_local_fallback_image(meme_data, filepath)

    # Pixel-based crop to eliminate external watermarks & production labels
    crop_meme_image(
        image_input=filepath,
        top_px=crop_top_px,
        bottom_px=crop_bottom_px,
        left_px=crop_left_px,
        right_px=crop_right_px,
        output_path=filepath,
    )

    return filepath


# -------------------------------------------------------------------------
# User Interaction & CLI Execution
# -------------------------------------------------------------------------
def open_image_viewer(filepath: Path) -> None:
    """Opens image in macOS / Linux / Windows default image viewer."""
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(filepath)], check=False)
        elif sys.platform.startswith("linux"):
            subprocess.run(["xdg-open", str(filepath)], check=False)
        elif sys.platform.startswith("win"):
            os.startfile(str(filepath))
    except Exception:
        pass


def generate_single_meme(topic: Optional[str] = None, auto_open: bool = True) -> Path:
    """Coordinates generation of concept, rendering, terminal output, and display."""
    print("\n" + "=" * 65)
    print(f"🤖 Generating English Meme using MIMO model ({DEFAULT_MODEL})...")
    print("=" * 65)

    start_t = time.time()
    meme_data = generate_meme_concept_with_mimo(topic=topic)
    elapsed = time.time() - start_t

    print(f"\n🎭 Topic:     {meme_data.get('topic', 'General English')}")
    print(f"🖼️  Template:  {meme_data.get('template', 'drake')}")
    print(f"⬆️  Top:       \"{meme_data.get('top_text', '')}\"")
    print(f"⬇️  Bottom:    \"{meme_data.get('bottom_text', '')}\"")
    if meme_data.get("joke"):
        print(f"💬 Punchline: {meme_data.get('joke')}")
    print(f"⏱️  Generated in {elapsed:.2f}s")

    print("\n🎨 Rendering meme image...")
    image_path = download_or_render_meme(meme_data)
    print("✅ Meme image successfully saved to:")
    print(f"   📁 {image_path}")

    if auto_open:
        open_image_viewer(image_path)

    return image_path


def main() -> None:
    """Main interactive terminal loop for generating memes on user button/key press."""
    parser = argparse.ArgumentParser(description="AI English & IELTS Meme Generator")
    parser.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Optional custom theme (e.g. 'IELTS Speaking', 'Present Perfect', 'Phrasal Verbs')",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not automatically open the generated image",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Generate one meme and exit immediately (non-interactive mode)",
    )
    args = parser.parse_args()

    print("\n" + "━" * 65)
    print("✨ WELCOME TO AI ENGLISH COACH - MEME GENERATOR ✨")
    print("━" * 65)
    print("Powered by MIMO v2 Model & TokenHarbor")
    print("Generates hilarious, relatable memes for IELTS & English Learners.")

    if args.once or args.topic:
        generate_single_meme(topic=args.topic, auto_open=not args.no_open)
        return

    while True:
        try:
            print("\n" + "─" * 65)
            user_input = input(
                "👉 Press [ENTER] to generate a random meme\n"
                "   (or type a custom topic like 'grammar', 'ielts', 'idioms', or 'q' to quit): "
            ).strip()

            if user_input.lower() in ("q", "quit", "exit"):
                print("\n👋 Happy studying! Keep practicing your English! ✨\n")
                break

            custom_topic = user_input if user_input else None
            generate_single_meme(topic=custom_topic, auto_open=not args.no_open)

        except (KeyboardInterrupt, EOFError):
            print("\n\n👋 Meme Generator closed. Happy learning!\n")
            break


if __name__ == "__main__":
    main()