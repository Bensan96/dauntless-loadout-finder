#!/usr/bin/env python3
"""Build one self-contained HTML file (dist/dauntless-loadout-finder.html) that works by double-clicking it.

It inlines the CSS, the scripts, data/game-data.json and the icons (as data URIs).
Usage: python3 scripts/build_single_file.py
"""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
html = rd('index.html')
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">', '<style>\n' + rd('assets/css/styles.css') + '</style>')
data = rd('data/game-data.json').replace('</', '<\\/')
import base64, glob
icons = {}
for f in sorted(glob.glob(os.path.join(root, 'assets', 'icons', '**', '*.webp'), recursive=True)):
    key = os.path.relpath(f, os.path.join(root, 'assets', 'icons'))[:-5].replace(os.sep, '/')
    icons[key] = 'data:image/webp;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
import json
script = '<script>window.__ICONS__=' + json.dumps(icons, separators=(',', ':')) + ';</script>\n<script>window.__GAME_DATA__=' + data + ';</script>\n<script>\n' + rd('assets/js/app.js').replace('</script', '<\\/script') + '</script>'
html = html.replace('<script src="data/game-data.js"></script>\n', '').replace('<script src="assets/js/buildcode.js"></script>\n', '<script>\n' + rd('assets/js/buildcode.js') + '</script>\n').replace('<script src="assets/js/cell-icons.js"></script>\n', '<script>\n' + rd('assets/js/cell-icons.js') + '</script>\n').replace('<script src="assets/js/app.js" defer></script>', script)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', 'dauntless-loadout-finder.html')
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html), 'bytes')
