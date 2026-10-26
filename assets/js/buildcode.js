/* Build codes of this tool: "DLF1." + base64url(JSON). Only this tool reads and writes them.
 *
 * The JSON holds stable item keys (the data file paths used in data/game-data.json) and the cells by perk name:
 *   { v:1, weapon:[key, level], bond:key|null, armour:{Head:[key, level], ...}, lantern:key|null, omnicell:key|null,
 *     parts:{mod|special|chamber|grip: key}, targets:[[perk, 1|2]], opts:{wt, wn, cv, sg, lg, ex}, cells:{ w0|w1|Head|Torso|Arms|Legs|lan : [perkName, rank 1-3] } }
 * Levels: 0 = base, 1 = max (power surged). A lantern of null means "any lantern with an Insight slot".
 */
(function () {
  const PREFIX = 'DLF1.';
  const ARMOUR = ['Head', 'Torso', 'Arms', 'Legs'];
  const SOCKETS = ['w0', 'w1', ...ARMOUR, 'lan'];

  const toCode = value => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromCode = text => {
    try {
      const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    } catch (e) {
      throw new Error('The build code could not be read.');
    }
  };

  function encode(build) {
    const armour = {};
    for (const slot of ARMOUR) {
      const a = build.armour[slot];
      armour[slot] = [a ? a.key : null, a ? a.level : 1];
    }
    return PREFIX + toCode({
      v: 1, weapon: [build.weapon.key, build.weapon.level], bond: build.bond || null, armour,
      lantern: build.lantern || null, omnicell: build.omnicell || null, parts: build.parts || {}, targets: build.targets || [], opts: build.opts || {}, cells: build.cells || {},
    });
  }

  function decode(input) {
    if (typeof input !== 'string' || !input.trim()) throw new Error('Paste a build code first.');
    const code = input.replace(/\s+/g, '');
    if (!code.startsWith(PREFIX)) throw new Error('This is not a code from this tool. It should start with ' + PREFIX);
    const v = fromCode(code.slice(PREFIX.length));
    if (!v || v.v !== 1 || !Array.isArray(v.weapon) || !v.armour) throw new Error('This build code is not valid.');
    for (const slot of Object.keys(v.cells || {})) {
      const c = v.cells[slot];
      if (!SOCKETS.includes(slot) || !Array.isArray(c) || typeof c[0] !== 'string' || !(c[1] >= 1 && c[1] <= 3)) throw new Error('The code contains an invalid cell.');
    }
    return { weapon: v.weapon, bond: v.bond || null, armour: v.armour, lantern: v.lantern || null, omnicell: v.omnicell || null, parts: v.parts && typeof v.parts === 'object' ? v.parts : {},
      targets: Array.isArray(v.targets) ? v.targets.filter(t => Array.isArray(t) && typeof t[0] === 'string' && (t[1] === 1 || t[1] === 2)) : [],
      opts: v.opts && typeof v.opts === 'object' ? v.opts : {}, cells: v.cells || {} };
  }

  window.BuildCode = { encode, decode, SOCKETS, ARMOUR };
})();
