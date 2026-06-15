#!/usr/bin/env python3
"""Trim empty margins from club-type icons and normalize to a uniform rounded square."""
from __future__ import annotations

import statistics
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "client" / "public" / "club-types"
OUTPUT_DIRS = [
    SOURCE_DIR,
    ROOT / "client" / "src" / "assets" / "club-types",
    ROOT / "apps" / "dojo-member" / "assets" / "club-types",
    ROOT / "uploads" / "_platform" / "club-types",
]

OUTPUT_SIZE = 512
CORNER_RADIUS_RATIO = 0.18
MIN_STD = 11
ROW_COL_MIN_FRAC = 0.012
BG_THRESHOLD = 22


def edge_bg_colors(img: Image.Image, strip_ratio: float = 0.06) -> list[tuple[int, int, int]]:
    from collections import Counter

    rgb = img.convert("RGB")
    w, h = rgb.size
    sw = max(4, int(w * strip_ratio))
    sh = max(4, int(h * strip_ratio))
    patches = [
        rgb.crop((0, 0, w, sh)),
        rgb.crop((0, h - sh, w, h)),
        rgb.crop((0, 0, sw, h)),
        rgb.crop((w - sw, 0, w, h)),
        rgb.crop((0, 0, sw, sh)),
        rgb.crop((w - sw, 0, w, sh)),
        rgb.crop((0, h - sh, sw, h)),
        rgb.crop((w - sw, h - sh, w, h)),
    ]
    colors: list[tuple[int, int, int]] = []
    for patch in patches:
        q = [(r // 8 * 8, g // 8 * 8, b // 8 * 8) for r, g, b in patch.getdata()]
        colors.append(Counter(q).most_common(1)[0][0])

    uniq: list[tuple[int, int, int]] = []
    for c in colors:
        if not any(sum((c[i] - u[i]) ** 2 for i in range(3)) ** 0.5 < 24 for u in uniq):
            uniq.append(c)
    return uniq


def dist(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5


def is_margin_pixel(r: int, g: int, b: int, a: int, bg_colors: list[tuple[int, int, int]]) -> bool:
    if a < 8:
        return True
    if r > 226 and g > 226 and b > 226:
        return True
    spread = max(r, g, b) - min(r, g, b)
    avg = (r + g + b) / 3
    if spread < 20 and avg > 185:
        return True
    if r < 22 and g < 22 and b < 22:
        return True
    for bg in bg_colors:
        if dist((r, g, b), bg) < BG_THRESHOLD:
            return True
    return False


def color_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    bg_colors = edge_bg_colors(rgba)
    pixels = list(rgba.getdata())

    def row_has(y: int) -> bool:
        non = sum(1 for x in range(w) if not is_margin_pixel(*pixels[y * w + x], bg_colors))
        return non / w > ROW_COL_MIN_FRAC

    def col_has(x: int) -> bool:
        non = sum(1 for y in range(h) if not is_margin_pixel(*pixels[y * w + x], bg_colors))
        return non / h > ROW_COL_MIN_FRAC

    top = next((y for y in range(h) if row_has(y)), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if row_has(y)), h - 1)
    left = next((x for x in range(w) if col_has(x)), 0)
    right = next((x for x in range(w - 1, -1, -1) if col_has(x)), w - 1)
    return left, top, right + 1, bottom + 1


def variance_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = [[rgb.getpixel((x, y)) for x in range(w)] for y in range(h)]

    def col_std(x: int) -> float:
        rs = [px[y][x][0] for y in range(h)]
        gs = [px[y][x][1] for y in range(h)]
        bs = [px[y][x][2] for y in range(h)]
        return (statistics.pstdev(rs) + statistics.pstdev(gs) + statistics.pstdev(bs)) / 3

    def row_std(y: int) -> float:
        rs = [px[y][x][0] for x in range(w)]
        gs = [px[y][x][1] for x in range(w)]
        bs = [px[y][x][2] for x in range(w)]
        return (statistics.pstdev(rs) + statistics.pstdev(gs) + statistics.pstdev(bs)) / 3

    left = next((x for x in range(w) if col_std(x) > MIN_STD), 0)
    right = next((x for x in range(w - 1, -1, -1) if col_std(x) > MIN_STD), w - 1)
    top = next((y for y in range(h) if row_std(y) > MIN_STD), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if row_std(y) > MIN_STD), h - 1)
    return left, top, right + 1, bottom + 1


def merge_bboxes(*boxes: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    """Keep the tightest crop that satisfies all detectors."""
    left = max(b[0] for b in boxes)
    top = max(b[1] for b in boxes)
    right = min(b[2] for b in boxes)
    bottom = min(b[3] for b in boxes)
    if right <= left or bottom <= top:
        # Fallback to the smallest-area bbox
        areas = [(b, (b[2] - b[0]) * (b[3] - b[1])) for b in boxes]
        return min(areas, key=lambda x: x[1])[0]
    return left, top, right, bottom


def zoom_center(img: Image.Image, factor: float = 1.08) -> Image.Image:
    w, h = img.size
    nw, nh = int(w * factor), int(h * factor)
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return scaled.crop((left, top, left + w, top + h))


def trim_margins(img: Image.Image, passes: int = 2) -> Image.Image:
    out = img
    for _ in range(passes):
        bbox = merge_bboxes(color_bbox(out), variance_bbox(out))
        cropped = out.crop(bbox)
        if cropped.size == out.size:
            break
        out = cropped
    return out


def center_crop_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def apply_round_mask(img: Image.Image, radius: int) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def trim_white_frame(img: Image.Image) -> Image.Image:
    """Strip pure-white padding from edges (common inner card border)."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = list(rgba.getdata())

    def is_pure_white(r: int, g: int, b: int, a: int) -> bool:
        return a > 200 and r > 242 and g > 242 and b > 242

    def row_white(y: int) -> bool:
        return sum(1 for x in range(w) if is_pure_white(*pixels[y * w + x])) / w > 0.85

    def col_white(x: int) -> bool:
        return sum(1 for y in range(h) if is_pure_white(*pixels[y * w + x])) / h > 0.85

    top = next((y for y in range(h) if not row_white(y)), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if not row_white(y)), h - 1)
    left = next((x for x in range(w) if not col_white(x)), 0)
    right = next((x for x in range(w - 1, -1, -1) if not col_white(x)), w - 1)
    if right <= left or bottom <= top:
        return img
    return img.crop((left, top, right + 1, bottom + 1))


def edge_margin_fraction(img: Image.Image, strip: int = 20) -> float:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = list(rgba.getdata())

    def is_light(r: int, g: int, b: int, a: int) -> bool:
        return a > 200 and r > 215 and g > 215 and b > 215

    edge_pixels: list[tuple[int, int, int, int]] = []
    for y in range(min(strip, h)):
        edge_pixels.extend(pixels[y * w + x] for x in range(w))
    for y in range(max(0, h - strip), h):
        edge_pixels.extend(pixels[y * w + x] for x in range(w))
    for x in range(min(strip, w)):
        edge_pixels.extend(pixels[y * w + x] for y in range(h))
    for x in range(max(0, w - strip), w):
        edge_pixels.extend(pixels[y * w + x] for y in range(h))

    if not edge_pixels:
        return 0.0
    return sum(1 for p in edge_pixels if is_light(*p)) / len(edge_pixels)


def normalize_image(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    cropped = trim_margins(img, passes=2)
    cropped = trim_white_frame(cropped)
    cropped = zoom_center(cropped, 1.10)
    square = center_crop_square(cropped)
    resized = square.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    resized = trim_margins(resized, passes=1)
    resized = trim_white_frame(resized)
    resized = zoom_center(resized, 1.06)
    if edge_margin_fraction(resized) > 0.14:
        resized = zoom_center(resized, 1.10)
        resized = trim_margins(resized, passes=1)
    side = max(resized.size)
    if side != OUTPUT_SIZE:
        square = center_crop_square(resized)
        resized = square.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    radius = max(8, round(OUTPUT_SIZE * CORNER_RADIUS_RATIO))
    return apply_round_mask(resized, radius)


def main() -> None:
    if not SOURCE_DIR.is_dir():
        raise SystemExit(f"Missing source dir: {SOURCE_DIR}")

    files = sorted(SOURCE_DIR.glob("*.png"))
    if not files:
        raise SystemExit("No PNG files found")

    print(f"Normalizing {len(files)} club-type images -> {OUTPUT_SIZE}px rounded square")
    for src in files:
        out = normalize_image(src)
        for dest_dir in OUTPUT_DIRS:
            dest_dir.mkdir(parents=True, exist_ok=True)
            out.save(dest_dir / src.name, "PNG", optimize=True)
        print(f"  {src.name}")

    print("Done.")


if __name__ == "__main__":
    main()
