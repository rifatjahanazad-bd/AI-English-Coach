"""meme_crop.py - Pixel-based image cropping for generated memes.

Removes external production marks, watermarks, and headers/footers
using explicit pixel parameters (top_px, bottom_px, left_px, right_px)
so the exact crop parameters can be mapped and tuned.
"""

from pathlib import Path
from typing import Optional, Union, Tuple
from PIL import Image

# Default cropping parameters in pixels (px)
# Crops 14px from bottom by default to remove memegen.link watermark footer
DEFAULT_CROP_PARAMS = {
    "top_px": 0,
    "bottom_px": 14,
    "left_px": 0,
    "right_px": 0,
}

# Template-specific crop offsets in pixels (if specific templates need unique offsets)
TEMPLATE_CROP_OVERRIDES = {
    "drake": {"top_px": 0, "bottom_px": 16, "left_px": 0, "right_px": 0},
    "db": {"top_px": 0, "bottom_px": 16, "left_px": 0, "right_px": 0},
    "spongebob": {"top_px": 0, "bottom_px": 14, "left_px": 0, "right_px": 0},
}


def get_crop_params_for_template(template: Optional[str] = None) -> dict:
    """Returns pixel crop margins for a given template."""
    if template and template.lower() in TEMPLATE_CROP_OVERRIDES:
        return TEMPLATE_CROP_OVERRIDES[template.lower()].copy()
    return DEFAULT_CROP_PARAMS.copy()


def crop_meme_image(
    image_input: Union[str, Path, Image.Image],
    top_px: int = 0,
    bottom_px: int = 14,
    left_px: int = 0,
    right_px: int = 0,
    output_path: Optional[Union[str, Path]] = None,
) -> Tuple[Image.Image, Optional[Path]]:
    """
    Crops specified pixels from each side of a meme image.

    Args:
        image_input: File path (str or Path) or PIL Image instance.
        top_px: Number of pixels to crop from the top.
        bottom_px: Number of pixels to crop from the bottom (e.g. 14px watermark).
        left_px: Number of pixels to crop from the left.
        right_px: Number of pixels to crop from the right.
        output_path: Optional destination file path to save the cropped image.

    Returns:
        Tuple of (cropped_pil_image, saved_path_or_None)
    """
    is_path = isinstance(image_input, (str, Path))
    if is_path:
        src_path = Path(image_input)
        img = Image.open(src_path)
    else:
        img = image_input
        src_path = None

    orig_w, orig_h = img.size

    # Ensure crop parameters are within safe bounds (keep at least 50x50px)
    crop_left = max(0, min(int(left_px), orig_w - 50))
    crop_top = max(0, min(int(top_px), orig_h - 50))
    crop_right = max(crop_left + 50, orig_w - max(0, int(right_px)))
    crop_bottom = max(crop_top + 50, orig_h - max(0, int(bottom_px)))

    # Box coordinates: (left, upper, right, lower)
    box = (crop_left, crop_top, crop_right, crop_bottom)
    cropped_img = img.crop(box)

    saved_path = None
    target_path = Path(output_path) if output_path else (src_path if is_path else None)

    if target_path:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        # Preserve original format or default to PNG
        fmt = img.format if img.format else "PNG"
        cropped_img.save(target_path, format=fmt)
        saved_path = target_path

    return cropped_img, saved_path
