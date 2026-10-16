"""Makes the FLEXD box pictures in public/boxes/ and writes src/components/chest/box-art.ts.

Every box is the same box: the silver clasp box of the client's first screen ("The Time Room"), cut
out with its glossy floor. Each catalogue finish is a colour grade of that one picture (the light,
reflections and print stay; the colour changes); the champagne-gold clasp is put back untouched, so
every box has the same lock.

Run from flexd/ (Pillow and numpy):
    python scripts/make_box_art.py <first-screen.png> [--preview <dir>]
Outlines are in that screen's pixels (592 wide); a sharper export of the same screen drops straight in.
"""

import hashlib
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "boxes"
TS = ROOT / "src" / "components" / "chest" / "box-art.ts"
SOURCE_WIDTH = 592
SCALE = 2
SUPER = 4  # mask supersampling

# The region kept, the box outline, a soft floor patch under it, the lid seam (left to right), the
# lid centre and the body's back-left top corner (hidden under the lid), in the screen's pixels.
REGION = (60, 180, 510, 362)  # the screen's carousel dots start at y 545
OUTLINE = [(93.3, 259.3), (270, 193.3), (534, 239.3), (531.3, 433.3), (380, 514), (100, 415)]
FLOOR = [(100, 415), (380, 514), (531.3, 433.3), (540, 462), (380, 536), (92, 448)]
SEAM = [(93.3, 300), (206.7, 331.7), (250, 348.3), (380, 388.3), (532.7, 304)]
LID = (319, 254.5)
BACK = (270, 232)
# Where the print is (lid crown, wordmark, categories), as boxes.
PRINT = [(262, 228, 380, 264), (118, 344, 192, 382), (455, 362, 512, 440)]
# The clasp (strap, its side and the tab over the lid), kept as it is on every finish.
CLASP = [(206.2, 290), (210, 282.5), (234.4, 271.9), (272.5, 283.1), (255.5, 292), (256, 397.5), (246.3, 398.5), (207.5, 384)]

# Catalogue finish key -> grade. The keys are the catalogue's material names.
FINISHES = {
    "ivory": "holo",  # Vanity: vivid holographic, the home screen's front box
    "navy": "black",  # First Edition, The Flap Room
    "sapphire": "pearl",  # Sun Club
    "obsidian": "silver",  # The Atelier, The Time Room: the screen's box as it is
    "bronze": "rose",  # Jewel Vault
    "gold": "gold",  # Grail Reserve
}


def local(points, scale=1.0):
    left, top = REGION[:2]
    return [((x - left) * SCALE * scale, (y - top) * SCALE * scale) for x, y in points]


def mask(points, size, blur):
    w, h = size
    big = Image.new("L", (w * SUPER, h * SUPER), 0)
    ImageDraw.Draw(big).polygon(local(points, SUPER), fill=255)
    return big.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))


def cut(path: str) -> Image.Image:
    src = Image.open(path).convert("RGB")
    k = src.width / SOURCE_WIDTH
    left, top, width, height = REGION
    crop = src.crop((round(left * k), round(top * k), round((left + width) * k), round((top + height) * k)))
    size = (width * SCALE, height * SCALE)
    art = crop.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    floor = Image.new("L", size, 0)
    ImageDraw.Draw(floor).polygon(local(FLOOR), fill=205)
    floor = floor.filter(ImageFilter.GaussianBlur(16))
    art.putalpha(Image.fromarray(np.maximum(np.asarray(mask(OUTLINE, size, 0.6)), np.asarray(floor))))
    return art


def grade(art: Image.Image, finish: str) -> Image.Image:
    """Keeps the picture's light and shade, changes its colour; the print stays readable."""
    if finish == "silver":
        return art
    a = np.asarray(art).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3:]
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    chroma = rgb - lum
    # Print and the crown: pixels clearly darker than their surroundings, inside the print areas.
    blur = np.asarray(Image.fromarray((lum[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32)[..., None] / 255
    where = Image.new("L", art.size, 0)
    for x0, y0, x1, y1 in PRINT:
        (ax, ay), (bx, by) = local([(x0, y0), (x1, y1)])
        ImageDraw.Draw(where).rectangle([ax, ay, bx, by], fill=255)
    where = np.asarray(where.filter(ImageFilter.GaussianBlur(4))).astype(np.float32)[..., None] / 255
    ink = np.clip((blur - lum - 0.05) / 0.12, 0, 1) * where

    if finish == "holo":
        # The rainbow pushed further, leaning violet, as on the home screen's front box.
        tone = np.array([0.03, -0.035, 0.07], np.float32)
        surface = 0.02 + 0.95 * lum + chroma * 2.3 + tone * (0.3 + 0.7 * lum)
        out = surface * (1 - 0.3 * ink)
    elif finish == "black":
        surface = 0.035 + 0.6 * lum**2.4 + chroma * 0.5
        print_color = np.array([0.78, 0.72, 0.92], np.float32)  # silver-lilac print, lilac crown
        out = surface * (1 - ink) + print_color * ink
    elif finish == "pearl":
        surface = 0.5 + 0.5 * lum + chroma * 0.3 + np.array([0.025, 0.015, -0.005], np.float32)
        out = surface * (1 - 0.6 * ink)
    elif finish == "gold":
        tone = np.array([0.11, 0.035, -0.13], np.float32)
        surface = 0.06 + 0.92 * lum + chroma * 0.22 + tone * (0.35 + 0.65 * lum)
        out = surface * (1 - 0.35 * ink)
    elif finish == "rose":
        tone = np.array([0.09, -0.035, 0.0], np.float32)
        surface = 0.04 + 0.95 * lum + chroma * 0.3 + tone * (0.35 + 0.65 * lum)
        out = surface * (1 - 0.35 * ink)
    else:
        raise ValueError(finish)

    # Only the box changes colour: the clasp keeps its own champagne gold, the floor stays as it is.
    box = np.asarray(mask(OUTLINE, art.size, 0.6)).astype(np.float32)[..., None] / 255
    keep = np.maximum(np.asarray(mask(CLASP, art.size, 0.5)).astype(np.float32)[..., None] / 255, 1 - box)
    out = out * (1 - keep) + rgb * keep
    out = np.clip(np.concatenate([out, alpha], axis=-1), 0, 1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def unit(point) -> list:
    left, top, width, height = REGION
    x, y = point
    return [round((x - left) / width, 4), round((y - top) / height, 4)]


def main(first: str, preview: str | None = None):
    base = cut(first)
    arts = {key: grade(base, finish) for key, finish in FINISHES.items()}
    if preview:
        Path(preview).mkdir(parents=True, exist_ok=True)
        for key, img in arts.items():
            img.save(Path(preview) / f"{key}.png")
        return
    for old in OUT.glob("*.webp"):
        old.unlink()
    entries = []
    for key, img in arts.items():
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=90, method=6)
        data = buf.getvalue()
        name = f"flexd-box-{key}-{hashlib.sha256(data).hexdigest()[:8]}.webp"
        (OUT / name).write_bytes(data)
        entry = {
            "src": f"/boxes/{name}",
            "width": img.width,
            "height": img.height,
            "seam": [unit(p) for p in SEAM],
            "lid": unit(LID),
            "back": unit(BACK),
        }
        entries.append(f"  {key}: {json.dumps(entry)},")
        print("wrote", name, img.size, len(data), "bytes")
    TS.write_text(
        "/** Generated by scripts/make_box_art.py: the box pictures, one box in six colours. */\n"
        'import type { BoxMaterial } from "@/domain/types";\n\n'
        "export interface BoxArt {\n"
        "  src: string;\n"
        "  width: number;\n"
        "  height: number;\n"
        "  /** The lid seam, left to right, as fractions of the picture (the lid lifts off along it). */\n"
        "  seam: readonly (readonly [number, number])[];\n"
        "  /** Centre of the lid, where the light comes out. */\n"
        "  lid: readonly [number, number];\n"
        "  /** The body's back-left top corner (under the lid); with the seam it outlines the open box's mouth. */\n"
        "  back: readonly [number, number];\n"
        "}\n\n"
        "export const BOX_ARTS: Record<BoxMaterial, BoxArt> = {\n" + "\n".join(entries) + "\n};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python scripts/make_box_art.py <first-screen.png> [--preview <dir>]")
    main(sys.argv[1], sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--preview" else None)
