#!/usr/bin/env node
// REHASH variant of wire-mermaid-from-map.mjs: updates the mermaidSrc SVG
// hash on <AsciiDiagram> tags that are ALREADY wired, for the fix-existing-
// diagram flow (restructured .mmd -> new content hash -> new SVG).
//
// Usage: node scripts/wire-mermaid-rehash.mjs <map.json>
//   map.json: [ { "id": "<course/page-id>", "hash": "<12-hex>" }, ... ]
//
// Idempotent: setting the same hash again is a no-op. Only touches tags
// whose id matches an entry; never edits content props. A tag that has no
// mermaidSrc yet is reported as MISSING-WIRE (use wire-mermaid-from-map.mjs
// for fresh wiring instead).

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
  console.error('Usage: node scripts/wire-mermaid-rehash.mjs <map.json>');
  process.exit(1);
}
const entries = JSON.parse(readFileSync(mapPath, 'utf8'));
const byId = new Map(entries.map((e) => [e.id, e.hash]));

let updated = 0, alreadyCurrent = 0, notWired = [];
const missing = new Map(entries.map((e) => [e.id, e.hash]));

const files = walk(DOCS_ROOT);
for (const file of files) {
  let src = readFileSync(file, 'utf8');
  let changed = false;

  // Chunk by <AsciiDiagram tag boundaries so an id match can never leak
  // into another component (e.g. YouTube's id prop).
  const OPEN = '<AsciiDiagram';
  const positions = [];
  let i = src.indexOf(OPEN);
  while (i !== -1) { positions.push(i); i = src.indexOf(OPEN, i + OPEN.length); }

  for (let p = positions.length - 1; p >= 0; p--) {
    const start = positions[p];
    const end = p + 1 < positions.length ? positions[p + 1] : src.length;
    const chunk = src.slice(start, end);

    const idMatch = chunk.match(/\bid="([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (!byId.has(id)) continue;
    const hash = byId.get(id);
    missing.delete(id);

    const nextChunk = chunk.replace(
      /mermaidSrc="\/img\/diagrams\/([0-9a-f]+)\.svg"/,
      (m0, old) => {
        if (old === hash) { alreadyCurrent++; return m0; }
        updated++;
        return `mermaidSrc="/img/diagrams/${hash}.svg"`;
      }
    );
    if (nextChunk === chunk && !/mermaidSrc=/.test(chunk)) notWired.push(id);
    if (nextChunk !== chunk) {
      src = src.slice(0, start) + nextChunk + src.slice(end);
      changed = true;
    }
  }

  if (changed) writeFileSync(file, src, 'utf8');
}

console.log(`Updated: ${updated}`);
console.log(`Already current: ${alreadyCurrent}`);
if (notWired.length) {
  console.log(`NOT WIRED (${notWired.length}) — tag found but no mermaidSrc prop:`);
  for (const id of notWired) console.log(`  - ${id}`);
}
if (missing.size) {
  console.log(`MISSING (${missing.size}) — no <AsciiDiagram id="..."> found for:`);
  for (const id of missing.keys()) console.log(`  - ${id}`);
}
