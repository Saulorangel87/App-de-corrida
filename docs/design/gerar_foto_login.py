"""Gera as versões otimizadas da foto da tela de login (AVIF, WebP e JPEG, duas larguras).

Uso: python docs/design/gerar_foto_login.py apps/web/src/assets/login
A origem é docs/design/foto-atleta-login.png (928 x 1152). Roda de novo se a foto mudar.
"""
import sys
from pathlib import Path

from PIL import Image

SRC = Path(__file__).with_name("foto-atleta-login.png")
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

WIDTHS = (464, 928)
img = Image.open(SRC).convert("RGB")
ratio = img.height / img.width

for w in WIDTHS:
    h = round(w * ratio)
    r = img.resize((w, h), Image.LANCZOS)
    r.save(OUT / f"login-{w}.avif", "AVIF", quality=55)
    r.save(OUT / f"login-{w}.webp", "WEBP", quality=72, method=6)
    r.save(OUT / f"login-{w}.jpg", "JPEG", quality=76, optimize=True, progressive=True)
    print(w, h)
