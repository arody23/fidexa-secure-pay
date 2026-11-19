"""Replace only the 1,7 USD amount on dashboard/withdraw screenshots."""
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = os.path.join("public", "assets", "landing", "journey")


def edit_amount(src, out, box, text, fill, font_size):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    l, t, r, b = [int(v * s) for v, s in zip(box, (w, h, w, h))]
    # sample background near top-left of amount area
    bg = im.getpixel((min(l + 8, w - 1), min(t + 8, h - 1)))
    draw = ImageDraw.Draw(im)
    draw.rectangle([l, t, r, b], fill=bg)
    font = None
    for fp in [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
    ]:
        if os.path.exists(fp):
            font = ImageFont.truetype(fp, font_size)
            break
    if font is None:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    th = bbox[3] - bbox[1]
    x = l + 2
    y = t + max(0, (b - t - th) // 2) - 2
    draw.text((x, y), text, font=font, fill=fill)
    im.convert("RGB").save(out, "PNG", optimize=True)
    print("wrote", out, im.size)


def main():
    dash = os.path.join(ASSETS, "provider-dashboard-raw.png")
    wd = os.path.join(ASSETS, "provider-withdraw-raw.png")
    print("dash", Image.open(dash).size)
    print("wd", Image.open(wd).size)
    # Tuned relative boxes for iPhone captures
    edit_amount(
        dash,
        os.path.join(ASSETS, "provider-dashboard.png"),
        box=(0.07, 0.268, 0.58, 0.328),
        text="2 480 USD",
        fill=(255, 255, 255, 255),
        font_size=40,
    )
    edit_amount(
        wd,
        os.path.join(ASSETS, "provider-withdraw.png"),
        box=(0.07, 0.188, 0.70, 0.248),
        text="2 480 USD",
        fill=(11, 47, 99, 255),
        font_size=42,
    )


if __name__ == "__main__":
    main()
