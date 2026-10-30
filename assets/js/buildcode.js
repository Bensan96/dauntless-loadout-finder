/* Build codes of this tool: DLF1 base64url(JSON), DLF2 compressed JSON, and compact DLF3 share codes.
 *
 * The JSON holds stable item keys (the data file paths used in data/game-data.json) and the cells by perk name:
 *   { v:1, weapon:[key, level], bond:key|null, armour:{Head:[key, level], ...}, lantern:key|null, omnicell:key|null,
 *     parts:{mod|special|chamber|grip: key}, targets:[[perk, 1|2]], opts:{wt, wn, cv, sg, lg, ex}, cells:{ w0|w1|Head|Torso|Arms|Legs|lan : [perkName, rank 1-3] } }
 * Levels: 0 = base, 1 = max (power surged). A lantern of null means "any lantern with an Insight slot".
 */
(function () {
  const PREFIX = 'DLF1.';
  const COMPACT_PREFIX = 'DLF3.';
  const LEGACY_COMPACT_PREFIX = 'DLF2.';
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

  function payload(build) {
    const armour = {};
    for (const slot of ARMOUR) {
      const a = build.armour[slot];
      armour[slot] = Array.isArray(a) ? a : [a ? a.key : null, a ? a.level : 1];
    }
    return {
      v: 1, weapon: Array.isArray(build.weapon) ? build.weapon : [build.weapon.key, build.weapon.level], bond: build.bond || null, armour,
      lantern: build.lantern || null, omnicell: build.omnicell || null, parts: build.parts || {}, targets: build.targets || [], opts: build.opts || {}, cells: build.cells || {},
    };
  }

  function validate(v) {
    if (!v || v.v !== 1 || !Array.isArray(v.weapon) || !v.armour) throw new Error('This build code is not valid.');
    for (const slot of Object.keys(v.cells || {})) {
      const c = v.cells[slot];
      if (!SOCKETS.includes(slot) || !Array.isArray(c) || typeof c[0] !== 'string' || !(c[1] >= 1 && c[1] <= 3)) throw new Error('The code contains an invalid cell.');
    }
    return { weapon: v.weapon, bond: v.bond || null, armour: v.armour, lantern: v.lantern || null, omnicell: v.omnicell || null, parts: v.parts && typeof v.parts === 'object' ? v.parts : {},
      targets: Array.isArray(v.targets) ? v.targets.filter(t => Array.isArray(t) && typeof t[0] === 'string' && (t[1] === 1 || t[1] === 2)) : [],
      opts: v.opts && typeof v.opts === 'object' ? v.opts : {}, cells: v.cells || {} };
  }

  function gearId(key) {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
    return '~' + hash.toString(36);
  }

  function gearKeyMap() {
    const data = window.__GAME_DATA__;
    if (!data) throw new Error('Game data is unavailable for compact sharing.');
    const byId = new Map(), byKey = new Map();
    const records = [
      ...(data.wp || []).map(x => x[8]),
      ...(data.arm || []).map(x => x[6]),
      ...(data.lan || []).map(x => x[2]),
      ...(data.omni || []).map(x => x[1]),
    ].filter(x => typeof x === 'string');
    for (const key of records) {
      const id = gearId(key), previous = byId.get(id);
      if (previous && previous !== key) throw new Error('A gear identifier collision prevents compact sharing.');
      byId.set(id, key);
      byKey.set(key, id);
    }
    return { byId, byKey };
  }

  function compactKey(key, byKey) {
    return typeof key === 'string' && byKey.has(key) ? byKey.get(key) : key;
  }

  function expandKey(key, byId) {
    if (typeof key !== 'string' || !key.startsWith('~')) return key;
    const expanded = byId.get(key);
    if (!expanded) throw new Error('This compact build refers to unknown gear. Update the tool data and try again.');
    return expanded;
  }

  function compactPayload(value, byKey) {
    const armour = {};
    for (const slot of ARMOUR) {
      const [key, level] = value.armour[slot];
      armour[slot] = [compactKey(key, byKey), level];
    }
    return {
      v: value.v,
      w: [compactKey(value.weapon[0], byKey), value.weapon[1]],
      b: compactKey(value.bond, byKey),
      a: armour,
      l: compactKey(value.lantern, byKey),
      o: compactKey(value.omnicell, byKey),
      p: value.parts,
      t: value.targets,
      x: value.opts,
      c: value.cells,
    };
  }

  function expandPayload(value, byId) {
    if (!value || value.v !== 1 || !Array.isArray(value.w) || !value.a) throw new Error('This build code is not valid.');
    const armour = {};
    for (const slot of ARMOUR) {
      const item = value.a[slot];
      armour[slot] = Array.isArray(item) ? [expandKey(item[0], byId), item[1]] : item;
    }
    return {
      v: value.v,
      weapon: [expandKey(value.w[0], byId), value.w[1]],
      bond: expandKey(value.b, byId),
      armour,
      lantern: expandKey(value.l, byId),
      omnicell: expandKey(value.o, byId),
      parts: value.p || {},
      targets: value.t || [],
      opts: value.x || {},
      cells: value.c || {},
    };
  }

  function codeInput(input, prefix) {
    if (typeof input !== 'string' || !input.trim()) throw new Error('Paste a build code first.');
    const code = input.replace(/\s+/g, '');
    if (!code.startsWith(prefix)) throw new Error('This is not a code from this tool. It should start with ' + prefix);
    return code.slice(prefix.length);
  }

  function encode(build) {
    return PREFIX + toCode(payload(build));
  }

  async function encodeCompact(build) {
    if (typeof CompressionStream === 'undefined') throw new Error('Compressed sharing is not supported in this browser.');
    const { byKey } = gearKeyMap();
    const bytes = new TextEncoder().encode(JSON.stringify(compactPayload(payload(build), byKey)));
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = '';
    for (const b of compressed) bin += String.fromCharCode(b);
    return COMPACT_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(input) {
    return validate(fromCode(codeInput(input, PREFIX)));
  }

  async function decodeCompact(input) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Compressed sharing is not supported in this browser.');
    const isLegacy = typeof input === 'string' && input.replace(/\s+/g, '').startsWith(LEGACY_COMPACT_PREFIX);
    const encoded = codeInput(input, isLegacy ? LEGACY_COMPACT_PREFIX : COMPACT_PREFIX);
    let value;
    try {
      const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      value = JSON.parse(await new Response(stream).text());
    } catch {
      throw new Error('The compressed build code could not be read.');
    }
    if (!isLegacy) {
      const { byId } = gearKeyMap();
      value = expandPayload(value, byId);
    }
    return validate(value);
  }

  window.BuildCode = { encode, decode, encodeCompact, decodeCompact, SOCKETS, ARMOUR };
})();
