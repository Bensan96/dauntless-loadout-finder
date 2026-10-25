#!/usr/bin/env python3
"""Create small webp icons (assets/icons/<key>.webp) for weapons, armor, lanterns, omnicells and the six cell families.

The source images are the 128 px PNGs of the Dauntless Builder Reforged project. The icon of an item has the same
path as its key (e.g. key "armours/urska/AdversarysDrive" -> assets/icons/armours/urska/AdversarysDrive.webp).

Usage: python3 scripts/build_icons.py [--source vendor/dauntless-builder-reforged]   (needs: pip install pillow)
"""
import argparse, glob, os
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--source', default='vendor/dauntless-builder-reforged')
ap.add_argument('--out', default='assets/icons')
ap.add_argument('--size', type=int, default=80)
args = ap.parse_args()
n = 0
for kind in ('armours', 'weapons', 'lanterns', 'omnicells'):
    for png in sorted(glob.glob(os.path.join(args.source, 'assets', 'icons', kind, '**', '*.png'), recursive=True)):
        rel = os.path.relpath(png, os.path.join(args.source, 'assets', 'icons'))[:-4]
        dst = os.path.join(args.out, rel + '.webp')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        Image.open(png).convert('RGBA').resize((args.size, args.size), Image.LANCZOS).save(dst, 'WEBP', quality=82, method=6)
        n += 1
# Cell family icons: the game's Alacrity/Brutality/Finesse/Fortitude/Insight/Prismatic symbols (white on transparent).
for fam in ('Alacrity', 'Brutality', 'Finesse', 'Fortitude', 'Insight', 'Prismatic'):
    png = os.path.join(args.source, 'assets', 'icons', 'perks', fam + '.png')
    dst = os.path.join(args.out, 'cells', fam + '.webp')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    Image.open(png).convert('RGBA').resize((args.size, args.size), Image.LANCZOS).save(dst, 'WEBP', quality=90, method=6)
    n += 1
# The cell symbols are drawn with CSS masks. Browsers refuse to load mask images from file:// paths, so the six small
# images are also written as data URIs to assets/js/cell-icons.js, which works when index.html is opened from disk.
import base64, json
cells = {}
for fam in ('Alacrity', 'Brutality', 'Finesse', 'Fortitude', 'Insight', 'Prismatic'):
    cells[fam] = 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(args.out, 'cells', fam + '.webp'), 'rb').read()).decode()
os.makedirs('assets/js', exist_ok=True)
with open('assets/js/cell-icons.js', 'w', encoding='utf-8') as f:
    f.write('window.__CELL_ICONS__=' + json.dumps(cells, separators=(',', ':')) + ';\n')
print(f'{n} icons -> {args.out}')
