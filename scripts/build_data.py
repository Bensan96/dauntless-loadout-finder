#!/usr/bin/env python3
"""Build data/game-data.json from the Dauntless Builder Reforged data folder.

Usage:
  git clone --depth 1 https://github.com/atomicptr/dauntless-builder-reforged.git vendor/dauntless-builder-reforged
  pip install pyyaml
  python3 scripts/build_data.py            # reads vendor/dauntless-builder-reforged/data
  python3 scripts/build_data.py --source PATH/TO/data --out data/game-data.json
"""
import argparse, glob, json, os, re, subprocess, datetime
import yaml

ap = argparse.ArgumentParser()
ap.add_argument('--source', default='vendor/dauntless-builder-reforged/data')
ap.add_argument('--out', default='data/game-data.json')
args = ap.parse_args()
R = args.source.rstrip('/') + '/'

def load(pattern):
    out = []
    for f in sorted(glob.glob(R + pattern)):
        d = yaml.safe_load(open(f, encoding='utf-8'))
        d['_key'] = os.path.relpath(f, R)[:-4].replace(os.sep, '/')
        out.append(d)
    return out

def perk_list(d):
    """[[perkName, baseValue], ...]: the unsurged value (the app uses 3 when "Power surged" is on)."""
    out = {}
    for p in d.get('perks') or []:
        e = out.setdefault(p['name'], [3, 3])
        e[1 if p.get('powerSurged') else 0] = p['value']
    return [[n, v[0]] for n, v in out.items()]

def tier_text(d, tier):
    e = (d.get('effects') or {}).get(str(tier)) or {}
    lines = e.get('description') or []
    if isinstance(lines, str):
        lines = [lines]
    res = []
    for line in lines:
        if not isinstance(line, str):
            continue
        for k, v in (e.get('values') or {}).items():
            line = line.replace('{{' + k + '}}', str(v))
        res.append(line)
    return res

def plain(text, values):
    """Fill {{placeholders}}, turn {{NL}} into line breaks and remove HTML tags."""
    if not text:
        return ''
    text = str(text)
    for k, v in (values or {}).items():
        text = text.replace('{{' + k + '}}', str(v))
    text = text.replace('{{NL}}', '\n')
    text = re.sub(r'<[^>]+>', '', text)
    return '\n'.join(' '.join(line.split()) for line in text.split('\n') if line.strip())

# Keystone Behemoths of the six Escalations. Their parts craft the legendary (bonded) weapons and their own armor.
ESCALATION = {'Torgadoro': 'Blaze', 'Malkarion': 'Shock', 'Thrax': 'Umbral', 'Agarus': 'Terra', 'Urska': 'Frost', 'Chronovore': 'Radiant'}

def fx_text(d):
    """Unique effect text, only for exotic items."""
    if d.get('rarity') != 'exotic':
        return ''
    return '\n'.join(plain(u.get('description'), u.get('values')) for u in d.get('unique_effects') or [])

perks = {d['name']: [d['type'], ' '.join((d.get('description') or '').split()), {'3': tier_text(d, 3), '6': tier_text(d, 6)}]
         for d in load('perks/*.yml')}
armour = [[d['name'], d['type'], d.get('behemoth') or '', d.get('cells') or '', perk_list(d),
           1 if d.get('rarity') == 'exotic' else 0, d['_key'], d.get('strength') or '', d.get('weakness') or '',
           (d.get('resistance') or {}).get('base', 0), (d.get('resistance') or {}).get('powerSurged'), fx_text(d), ESCALATION.get(d.get('behemoth'), '')] for d in load('armours/*/*.yml')]
weapons = [[d['name'], d['type'], d.get('behemoth') or '', d.get('elemental') or '', d.get('cells') or [], perk_list(d),
            1 if d.get('rarity') == 'exotic' else 0,
            (d.get('bond') or {}).get('elemental', '') if d.get('bond') else '', d['_key'], fx_text(d), ESCALATION.get(d.get('behemoth'), '')] for d in load('weapons/*/*.yml')]

def lantern_text(d):
    a = d.get('lantern_ability') or {}
    parts = []
    if a.get('instant'):
        parts.append('Tap: ' + plain(a['instant'], d.get('values')))
    if a.get('hold'):
        parts.append('Hold: ' + plain(a['hold'], d.get('values')))
    return '\n'.join(parts)

lanterns = [[d['name'], d.get('cells') or '', d['_key'], lantern_text(d)] for d in load('lanterns/*.yml')]
omni = [[d['name'], d['_key'], 'Passive: ' + plain(d.get('passive'), d.get('passive_values')),
         'Active: ' + plain(d.get('active'), d.get('active_values'))] for d in load('omnicells/*.yml')]
cell_keys = {}
for d in load('cells/*/*.yml'):
    for v in (d.get('variants') or {}).values():
        for perk in (v.get('perks') or {}):
            cell_keys[perk] = d['_key']

# Weapon parts (mods, specials, chambers, grips) only add effects, they do not change perk totals.
PART_DIRS = {'aetherstrikers': 'Aether Strikers', 'axe': 'Axe', 'chainblades': 'Chain Blades', 'hammer': 'Hammer',
             'repeater': 'Repeater', 'sword': 'Sword', 'warpike': 'War Pike'}
PART_KINDS = {'mods': 'mod', 'specials': 'special', 'chambers': 'chamber', 'grips': 'grip'}
parts = {}
for d in load('parts/*/*/*.yml'):
    _, wdir, kdir, _ = d['_key'].split('/')
    effect = '\n'.join(plain(t, d.get('values')) for t in (d.get('part_effect') or []))
    parts.setdefault(PART_DIRS[wdir], {}).setdefault(PART_KINDS[kdir], []).append(
        [d['name'], d['_key'], effect, 1 if 'Recommended' in (d.get('tags') or []) else 0])

bond_behemoths = {w[2] for w in weapons if w[7]}
assert bond_behemoths == set(ESCALATION), ('Escalation Behemoths differ from the legendary weapon Behemoths', bond_behemoths)

misc = yaml.safe_load(open(R + 'misc.yml', encoding='utf-8')) or {}
commit = ''
try:
    commit = subprocess.check_output(['git', '-C', R, 'rev-parse', 'HEAD'], text=True, stderr=subprocess.DEVNULL).strip()
except Exception:
    pass

out = {
    'meta': {'gameVersion': str(misc.get('dauntless_version', '')), 'source': 'https://github.com/atomicptr/dauntless-builder-reforged',
             'sourceCommit': commit, 'generated': datetime.date.today().isoformat()},
    # perks: {name: [family, description, {"3": [...], "6": [...]}]}
    'perks': perks,
    # arm: [name, slot (Head/Torso/Arms/Legs), behemoth, cellFamily, [[perk, baseValue]], isExotic, key,
    #       strengthElement, weaknessElement, resistanceBase, resistancePowerSurged, exoticEffectText, escalationElement ("" if not Escalation gear)]
    'arm': armour,
    # wp: [name, type, behemoth, element, [cellFamilies], [[perk, baseValue]], isExotic, bondElement ("" if not legendary), key, exoticEffectText, escalationElement]
    'wp': weapons,
    # lan: [[lanternName, cellFamily, key, abilityText]]; cellKeys: {perkName: cellKey}. Keys are the data file paths
    # (e.g. "weapons/agarus/AgentsOfDecay"), which the build codes (DLF1.…) of the tool use.
    'lan': lanterns,
    # omni: [[name, key, passiveText, activeText]]
    'omni': omni,
    # parts: {weaponType: {mod|special|chamber|grip: [[name, key, effectText, recommended]]}}
    'parts': parts,
    'cellKeys': cell_keys,
}
os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
text = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
with open(args.out, 'w', encoding='utf-8') as f:
    f.write(text)
# Same data as a script file, so index.html also works when opened directly from disk (file://), where fetch() is blocked.
with open(os.path.splitext(args.out)[0] + '.js', 'w', encoding='utf-8') as f:
    f.write('window.__GAME_DATA__=' + text.replace('</', '<\\/') + ';\n')
print(f'{len(perks)} perks, {len(armour)} armour, {len(weapons)} weapons -> {args.out}')
