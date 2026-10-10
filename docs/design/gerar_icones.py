"""Gera favicon e ícones PWA do Let's Go Run a partir da mesma geometria (grade 24x24)."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

ORANGE = (255, 90, 31, 255)   # #FF5A1F
WHITE = (255, 255, 255, 255)
NAVY_HEX = "#111827"

# Corredor (mesma figura do logo nas telas), em coordenadas de uma grade 24x24
LINES = [
    [(4, 17), (9, 18), (9.75, 16.5)],
    [(15, 21), (15, 17), (11, 14), (12, 8)],
    [(7, 12), (7, 9), (12, 8), (15, 11), (18, 12)],
]
HEAD = (14, 4)
GLYPH_CENTER = (11, 11.5)


def render(size, *, scale_div, stroke, radius_ratio, ss=8):
    """radius_ratio: 0 = quadrado cheio (full-bleed); >0 = cantos arredondados transparentes."""
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if radius_ratio:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=ORANGE)
    else:
        d.rectangle([0, 0, S, S], fill=ORANGE)

    k = S / scale_div
    ox = S / 2 - GLYPH_CENTER[0] * k
    oy = S / 2 - GLYPH_CENTER[1] * k
    p = lambda x, y: (ox + x * k, oy + y * k)
    w = stroke * k
    r = w / 2
    for line in LINES:
        pts = [p(*pt) for pt in line]
        d.line(pts, fill=WHITE, width=round(w))
        for (x, y) in pts:  # cantos e pontas arredondados
            d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)
    hx, hy = p(*HEAD)
    hr = (1 + stroke / 2) * k
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def svg(scale_div=26.5, stroke=2.5, radius_ratio=0.22):
    S = 64
    k = S / scale_div
    ox = S / 2 - GLYPH_CENTER[0] * k
    oy = S / 2 - GLYPH_CENTER[1] * k
    f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
    paths = []
    for line in LINES:
        pts = [(ox + x * k, oy + y * k) for x, y in line]
        dstr = "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts)
        paths.append(f'<path d="{dstr}"/>')
    hx, hy = ox + HEAD[0] * k, oy + HEAD[1] * k
    hr = (1 + stroke / 2) * k
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect width="64" height="64" rx="{f(S * radius_ratio)}" fill="#FF5A1F"/>'
        f'<g fill="none" stroke="#fff" stroke-width="{f(stroke * k)}" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(paths)
        + "</g>"
        f'<circle cx="{f(hx)}" cy="{f(hy)}" r="{f(hr)}" fill="#fff"/>'
        "</svg>\n"
    )


# Favicon vetorial (navegadores modernos)
(OUT / "favicon.svg").write_text(svg(), encoding="utf-8")

# favicon.ico (16, 32, 48) — cada tamanho desenhado separadamente para ficar nítido
ico_imgs = {s: render(s, scale_div=26.5, stroke=2.7 if s <= 16 else 2.5, radius_ratio=0.22) for s in (16, 32, 48)}
ico_imgs[48].save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                  append_images=[ico_imgs[16], ico_imgs[32]])

# Apple (iOS aplica os cantos sozinho: quadrado cheio, sem transparência)
render(180, scale_div=32, stroke=2.3, radius_ratio=0).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)

# PWA "any": cantos arredondados com fundo transparente
for s in (192, 512):
    render(s, scale_div=28, stroke=2.3, radius_ratio=0.22, ss=4).save(OUT / f"icon-{s}.png", optimize=True)

# PWA "maskable": quadrado cheio, figura dentro da zona segura (círculo de 80%)
for s in (192, 512):
    render(s, scale_div=42, stroke=2.3, radius_ratio=0, ss=4).convert("RGB").save(OUT / f"icon-maskable-{s}.png", optimize=True)

manifest = {
    "name": "Let's Go Run — Treino de corrida",
    "short_name": "Let's Go Run",
    "description": "Planos de corrida personalizados, com base científica.",
    "lang": "pt-BR",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": NAVY_HEX,
    "theme_color": NAVY_HEX,
    "icons": [
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
        {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
(OUT / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Prévia para revisão (não vai para o app)
prev = Image.new("RGBA", (1060, 330), (245, 246, 248, 255))
dp = ImageDraw.Draw(prev)
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 14)
x = 20
items = [
    (ico_imgs[16].resize((64, 64), Image.NEAREST), "16px (zoom 4x)"),
    (ico_imgs[32].resize((64, 64), Image.NEAREST), "32px (zoom 2x)"),
    (Image.open(OUT / "apple-touch-icon.png").convert("RGBA"), "apple 180"),
    (Image.open(OUT / "icon-192.png"), "icon-192 (any)"),
]
mk = Image.open(OUT / "icon-maskable-512.png").convert("RGBA").resize((240, 240), Image.LANCZOS)
mask = Image.new("L", (240, 240), 0)
ImageDraw.Draw(mask).ellipse([0, 0, 239, 239], fill=255)
circ = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
circ.paste(mk, (0, 0), mask)
items.append((circ, "maskable (Android, círculo)"))
for im, label in items:
    y = 40 + (240 - im.height) // 2
    prev.alpha_composite(im, (x, y))
    dp.text((x, 300), label, fill=(71, 85, 105, 255), font=font)
    x += im.width + 40
prev.save(OUT.parent / "icones-previa.png")
print(sorted(p.name for p in OUT.iterdir()))
