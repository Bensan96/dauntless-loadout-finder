#!/usr/bin/env node
// Build data/materials.js from the Dauntless Wiki's public page data.
// Usage: node scripts/build_materials.js
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(__dirname);
const gameData = JSON.parse(fs.readFileSync(path.join(root, 'data/game-data.json'), 'utf8'));
const gear = [
  ...gameData.arm.map(item => ({ name: item[0], key: item[6] })),
  ...gameData.wp.map(item => ({ name: item[0], key: item[8] })),
];
const amountPattern = /\{\{([^{}|]+)(?:\|[^{}]*)?\}\}\s*\(x([\d,.]+)\)/g;
const pageSize = 40;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function materialsInRow(row) {
  const materials = new Map();
  for (const match of row.matchAll(amountPattern)) {
    const name = match[1].trim().replace(/-$/, '');
    const amount = Number(match[2].replace(/[,.]/g, ''));
    if (!name || !Number.isSafeInteger(amount)) continue;
    materials.set(name, (materials.get(name) || 0) + amount);
  }
  return [...materials];
}

function parseRecipe(wikitext) {
  const header = wikitext.indexOf('Crafting Requirements');
  if (header < 0) return { craft: [], upgrade: [] };
  const start = wikitext.lastIndexOf('{|', header);
  const end = wikitext.indexOf('|}', header);
  if (start < 0 || end < 0) return { craft: [], upgrade: [] };

  const table = wikitext.slice(start, end);
  const rows = table.split(/\n\|-\s*\n/);
  const craft = new Map();
  const upgrade = new Map();
  for (const row of rows) {
    const level = row.match(/^\s*\|\s*(\d+|craft)\s*\|{1,2}/i);
    if (!level) continue;
    const target = level[1].toLowerCase() === 'craft' || Number(level[1]) === 1 ? craft : upgrade;
    for (const [name, amount] of materialsInRow(row)) {
      target.set(name, (target.get(name) || 0) + amount);
    }
  }
  return { craft: [...craft], upgrade: [...upgrade] };
}

function resolveTitle(title, aliases) {
  let result = title;
  for (let i = 0; i < 10; i++) {
    const next = aliases.get(result.toLowerCase());
    if (!next || next.toLowerCase() === result.toLowerCase()) break;
    result = next;
  }
  return result;
}

async function fetchBatch(batch) {
  const params = new URLSearchParams({
    action: 'query',
    redirects: '1',
    titles: batch.map(item => item.name).join('|'),
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
  });
  const response = await fetch(`https://dauntless.fandom.com/api.php?${params}`, {
    headers: { 'User-Agent': 'DauntlessLoadoutFinder/1.0 (recipe data build)' },
  });
  if (!response.ok) throw new Error(`Wiki API request failed: HTTP ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error(`Wiki API error: ${result.error.info}`);

  const aliases = new Map();
  for (const link of [...(result.query.normalized || []), ...(result.query.redirects || [])]) {
    aliases.set(link.from.toLowerCase(), link.to);
  }
  const pages = new Map(Object.values(result.query.pages).map(page => [page.title.toLowerCase(), page]));
  return batch.map(item => {
    const title = resolveTitle(item.name, aliases);
    const page = pages.get(title.toLowerCase());
    const wikitext = page?.revisions?.[0]?.slots?.main?.['*'] || '';
    return {
      key: item.key,
      name: item.name,
      sourceTitle: page && page.missing === undefined ? page.title : '',
      ...parseRecipe(wikitext),
    };
  });
}

async function main() {
  const items = {};
  const missingPages = [];
  for (let i = 0; i < gear.length; i += pageSize) {
    const batch = gear.slice(i, i + pageSize);
    for (const item of await fetchBatch(batch)) {
      if (!item.sourceTitle) missingPages.push(item.name);
      items[item.key] = {
        name: item.name,
        sourceTitle: item.sourceTitle,
        craft: item.craft,
        upgrade: item.upgrade,
      };
    }
    if (i + pageSize < gear.length) await delay(250);
  }

  const json = JSON.stringify({ items, behemoths: {} }).replace(/<\//g, '<\\/');
  const output = `window.__MATERIALS__=${json};\n`;
  fs.writeFileSync(path.join(root, 'data/materials.js'), output, 'utf8');
  const withRecipes = Object.values(items).filter(item => item.craft.length || item.upgrade.length).length;
  console.log(`${withRecipes}/${gear.length} items have crafting or upgrade materials.`);
  if (missingPages.length) console.warn(`Wiki pages not found: ${missingPages.join(', ')}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
