#!/usr/bin/env python3
"""Build assets/js/icons.js: all item pictures and the six cell family symbols as small webp data URIs.

One file instead of ~400 image files keeps the repository small and easy to upload.
Keys: the item key (e.g. "armours/urska/AdversarysDrive", "weapons/...", "lanterns/...", "omnicells/...")
and "cells/<Family>" for Alacrity, Brutality, Finesse, Fortitude, Insight and Prismatic.

Usage: python3 scripts/build_icons.py [--source vendor/dauntless-builder-reforged]   (needs: pip install pillow)
"""
import argparse, base64, glob, io, json, os
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--source', default='vendor/dauntless-builder-reforged')
ap.add_argument('--out', default='assets/js/icons.js')
ap.add_argument('--size', type=int, default=80)
args = ap.parse_args()
base = os.path.join(args.source, 'assets', 'icons')

def webp(png, quality):
    buf = io.BytesIO()
    Image.open(png).convert('RGBA').resize((args.size, args.size), Image.LANCZOS).save(buf, 'WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

icons = {}
for kind in ('armours', 'weapons', 'lanterns', 'omnicells', 'parts'):
    for png in sorted(glob.glob(os.path.join(base, kind, '**', '*.png'), recursive=True)):
        icons[os.path.relpath(png, base)[:-4].replace(os.sep, '/')] = webp(png, 82)
# The cell symbols are white on transparent; the page draws them as masks so they take the colour of their family.
for fam in ('Alacrity', 'Brutality', 'Finesse', 'Fortitude', 'Insight', 'Prismatic'):
    icons['cells/' + fam] = webp(os.path.join(base, 'perks', fam + '.png'), 90)

os.makedirs(os.path.dirname(args.out), exist_ok=True)
with open(args.out, 'w', encoding='utf-8') as f:
    f.write('window.__ICONS__=' + json.dumps(icons, separators=(',', ':')) + ';\n')
print(f'{len(icons)} icons -> {args.out} ({os.path.getsize(args.out) // 1024} KB)')
