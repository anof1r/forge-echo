"""Generates the Forge Echo PWA icons: an ember with concentric echo rings."""
from pathlib import Path

from PIL import Image, ImageDraw

BACKGROUND = (20, 17, 15, 255)
EMBER = (240, 160, 75)
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SCALE = 4


def render(size: int, safe: float) -> Image.Image:
    big = size * SCALE
    image = Image.new("RGBA", (big, big), BACKGROUND)
    draw = ImageDraw.Draw(image)
    center = big / 2
    radius = big * safe / 2

    dot = radius * 0.18
    draw.ellipse([center - dot, center - dot, center + dot, center + dot], fill=EMBER + (255,))

    for ring, (scale, width) in enumerate([(0.5, 0.07), (0.78, 0.06), (1.0, 0.05)]):
        r = radius * scale
        w = max(1, int(radius * width))
        alpha = int(255 * (1 - ring * 0.25))
        draw.ellipse([center - r, center - r, center + r, center + r], outline=EMBER + (alpha,), width=w)

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    render(192, 0.84).save(OUT / "icon-192.png")
    render(512, 0.84).save(OUT / "icon-512.png")
    render(512, 0.58).save(OUT / "icon-maskable-512.png")
    render(180, 0.74).convert("RGB").save(OUT / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
