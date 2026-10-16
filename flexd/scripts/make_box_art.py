"""Cuts the FLEXD boxes out of the client's screens into public/boxes/ and writes
src/components/chest/box-art.ts. Two boxes are the client's own pictures: the silver clasp box of
their first screen ("The Time Room") and the holographic band box of their second (the home screen).
The other finishes in that screen (black, pearl) and two more (gold, rose) are graded from those two
pictures: the light and shade stay, the colour changes, the print stays readable.

Run from flexd/ (Pillow and numpy):
    python scripts/make_box_art.py <first-screen.png> <home-screen.png>
Outlines are in those screens' pixels (592 wide); sharper exports of the same screens drop straight in.
"""

import hashlib
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

# Each base picture: the region kept, the box outline, a soft floor patch under it, the lid seam
# (left to right), the lid centre and the body's back-left top corner (hidden under the lid).
CLASP = {
    "region": (60, 180, 510, 362),  # the first screen's carousel dots start at y 545
    "outline": [(93.3, 259.3), (270, 193.3), (534, 239.3), (531.3, 433.3), (380, 514), (100, 415)],
    "floor": [(100, 415), (380, 514), (531.3, 433.3), (540, 462), (380, 536), (92, 448)],
    "seam": [(93.3, 300), (206.7, 331.7), (250, 348.3), (380, 388.3), (532.7, 304)],
    "lid": (319, 254.5),
    "back": (270, 232),
    # Where the print is (crown, wordmark, categories, clasp crown), as boxes in the screen's pixels.
    "print": [(262, 228, 380, 264), (118, 344, 192, 382), (455, 362, 512, 440), (208, 333, 244, 367)],
}
# The band box has no seam of its own; the lid is its top third, where a lid would sit.
BAND = {
    "region": (66, 700, 500, 380),  # the home screen's tab bar starts near y 1085
    "outline": [(96.7, 810.7), (293.3, 739), (538.3, 819.3), (536.7, 966.7), (341.7, 1063.3), (101.7, 941.7)],
    "floor": [(101.7, 941.7), (341.7, 1063.3), (536.7, 966.7), (546, 995), (341.7, 1074), (92, 970)],
    "seam": [(97.9, 850), (340.4, 959.4), (537.8, 863.4)],
    "lid": (318, 820),
    "back": (293.3, 773),
    "print": [(262, 790, 368, 838), (352, 888, 446, 950), (255, 935, 312, 1017)],
}


def cut(path: str, spec: dict) -> Image.Image:
    src = Image.open(path).convert("RGB")
    k = src.width / SOURCE_WIDTH
    left, top, width, height = spec["region"]
    crop = src.crop((round(left * k), round(top * k), round((left + width) * k), round((top + height) * k)))
    w, h = width * SCALE, height * SCALE
    art = crop.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))

    def poly(points, scale):
        return [((x - left) * SCALE * scale, (y - top) * SCALE * scale) for x, y in points]

    big = Image.new("L", (w * SUPER, h * SUPER), 0)
    ImageDraw.Draw(big).polygon(poly(spec["outline"], SUPER), fill=255)
    box = big.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    floor = Image.new("L", (w, h), 0)
    ImageDraw.Draw(floor).polygon(poly(spec["floor"], 1), fill=205)
    floor = floor.filter(ImageFilter.GaussianBlur(16))
    alpha = Image.fromarray(np.maximum(np.asarray(box), np.asarray(floor)))
    art.putalpha(alpha)
    where = Image.new("L", (w, h), 0)
    for x0, y0, x1, y1 in spec["print"]:
        ImageDraw.Draw(where).rectangle([(x0 - left) * SCALE, (y0 - top) * SCALE, (x1 - left) * SCALE, (y1 - top) * SCALE], fill=255)
    art.info["print"] = where.filter(ImageFilter.GaussianBlur(4))
    return art


def grade(art: Image.Image, finish: str) -> Image.Image:
    """Keeps the picture's light and shade, changes its colour; dark print stays readable."""
    a = np.asarray(art).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3:]
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    chroma = rgb - lum
    # Print and the crown: pixels clearly darker than their surroundings.
    blur = np.asarray(Image.fromarray((lum[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32)[..., None] / 255
    where = np.asarray(art.info["print"]).astype(np.float32)[..., None] / 255
    ink = np.clip((blur - lum - 0.05) / 0.12, 0, 1) * where

    if finish == "black":
        surface = 0.035 + 0.6 * lum**2.4 + chroma * 0.45
        print_color = np.array([0.78, 0.72, 0.92], np.float32)  # silver-lilac print, lilac crown
        out = surface * (1 - ink) + print_color * ink
    elif finish == "pearl":
        surface = 0.6 + 0.4 * lum + chroma * 0.28 + np.array([0.02, 0.012, -0.004], np.float32)
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
    out = np.clip(np.concatenate([out, alpha], axis=-1), 0, 1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def unit(spec: dict, point) -> list:
    left, top, width, height = spec["region"]
    x, y = point
    return [round((x - left) / width, 4), round((y - top) / height, 4)]


def main(first: str, home: str, preview: str | None = None):
    clasp = cut(first, CLASP)
    band = cut(home, BAND)
    # Catalogue finish key -> (picture, base); the keys are the catalogue's material names.
    arts = {
        "obsidian": (clasp, CLASP),  # silver clasp box (The Atelier, The Time Room)
        "ivory": (band, BAND),  # holographic band box (Vanity, the first box, as on the home screen)
        "navy": (grade(band, "black"), BAND),  # black (First Edition, The Flap Room)
        "sapphire": (grade(band, "pearl"), BAND),  # pearl (Sun Club)
        "gold": (grade(clasp, "gold"), CLASP),  # gold (Grail Reserve)
        "bronze": (grade(clasp, "rose"), CLASP),  # rose (Jewel Vault)
    }
    if preview:
        Path(preview).mkdir(parents=True, exist_ok=True)
        for key, (img, _) in arts.items():
            img.save(Path(preview) / f"{key}.png")
        return
    for old in OUT.glob("*.webp"):
        old.unlink()
    entries = []
    for key, (img, spec) in arts.items():
        import io

        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=90, method=6)
        data = buf.getvalue()
        name = f"flexd-box-{key}-{hashlib.sha256(data).hexdigest()[:8]}.webp"
        (OUT / name).write_bytes(data)
        entry = {
            "src": f"/boxes/{name}",
            "width": img.width,
            "height": img.height,
            "seam": [unit(spec, p) for p in spec["seam"]],
            "lid": unit(spec, spec["lid"]),
            "back": unit(spec, spec["back"]),
        }
        entries.append(f"  {key}: {json.dumps(entry)},")
        print("wrote", name, img.size, len(data), "bytes")
    TS.write_text(
        '/** Generated by scripts/make_box_art.py: the box pictures, cut from the client\'s screens. */\n'
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
    if len(sys.argv) < 3:
        sys.exit("usage: python scripts/make_box_art.py <first-screen.png> <home-screen.png> [--preview <dir>]")
    main(sys.argv[1], sys.argv[2], sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--preview" else None)
