#!/usr/bin/env node
// Wires mermaidSrc="/img/diagrams/<hash>.svg" into <AsciiDiagram> tags using
// an explicit {id, hash} map produced by a check-landscape-band run.
//
// Usage: node scripts/wire-mermaid-from-map.mjs <map.json>
//   map.json: [ { "id": "<course/page-id>", "hash": "<12-hex>" }, ... ]
//
// Idempotent: a tag that already carries mermaidSrc is left untouched.
// Only touches tags whose id matches an entry; never edits content props.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(mdx|md)$/.test(e.name)) out.push(full);
  }
  return out;
}

const mapPath = process.argv[2];
if (!mapPath) {
  console.error('Usage: node scripts/wire-mermaid-from-map.mjs <map.json>');
  process.exit(1);
}
const entries = JSON.parse(readFileSync(mapPath, 'utf8'));
const byId = new Map(entries.map((e) => [e.id, e.hash]));

let wired = 0, alreadyWired = 0, missing = [];

const files = walk(DOCS_ROOT);
for (const file of files) {
  let src = readFileSync(file, 'utf8');
  let changed = false;

  // Chunk the source by <AsciiDiagram tag boundaries so an id match can
  // never leak into another component (e.g. YouTube's id prop).
  const OPEN = '<AsciiDiagram';
  const positions = [];
  let i = src.indexOf(OPEN);
  while (i !== -1) { positions.push(i); i = src.indexOf(OPEN, i + OPEN.length); }

  for (let p = positions.length - 1; p >= 0; p--) {
    const start = positions[p];
    const end = p + 1 < positions.length ? positions[p + 1] : src.length;
    const chunkStart = start, chunkEnd = end;
    const chunk = src.slice(chunkStart, chunkEnd);

    const idMatch = chunk.match(/\bid="([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const hash = byId.get(id);
    if (!hash) continue;

    if (/mermaidSrc\s*=/.test(chunk)) { alreadyWired++; byId.delete(id); continue; }

    const newChunk = chunk.replace(
      new RegExp(`(\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`),
      `$1\n  mermaidSrc="/img/diagrams/${hash}.svg"`
    );
    if (newChunk === chunk) continue;
    src = src.slice(0, chunkStart) + newChunk + src.slice(chunkEnd);
    changed = true;
    wired++;
    byId.delete(id);
  }

  if (changed) writeFileSync(file, src, 'utf8');
}

for (const id of byId.keys()) missing.push(id);

console.log(`Wired: ${wired}`);
console.log(`Already wired (skipped): ${alreadyWired}`);
if (missing.length) {
  console.log(`MISSING (${missing.length}) — no <AsciiDiagram id="..."> found for:`);
  for (const id of missing) console.log(`  - ${id}`);
}
