#!/usr/bin/env node
// Deletes orphaned hash-named SVGs from apps/docs/static/img/diagrams/.
//
// Every wired diagram references its render as mermaidSrc="/img/diagrams/<12-hex>.svg".
// When a diagram is fixed/re-rendered, its content hash changes and the old
// SVG becomes unreachable dead weight. This script computes the referenced
// set from BOTH ground truths — live mermaidSrc refs in docs source AND the
// git-tracked manifests — then deletes every 12-hex .svg on disk that
// nothing references.
//
// Never touches: the slug-named directories (generated-PNG pipeline from
// scripts/generate-diagrams.js) or anything that isn't a 12-hex .svg.
//
// Usage:
//   node scripts/delete-orphaned-diagram-svgs.mjs           # report only
//   node scripts/delete-orphaned-diagram-svgs.mjs --delete  # actually delete

import { readFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');
const MANIFESTS = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
const IMG_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'static', 'img', 'diagrams');
const DELETE = process.argv.includes('--delete');

const referenced = new Set();

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(mdx|md)$/.test(e.name)) out.push(full);
  }
  return out;
}

// Ground truth 1: what pages actually reference right now.
for (const file of walk(DOCS_ROOT)) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\/img\/diagrams\/([0-9a-f]{12})\.svg/g)) {
    referenced.add(m[1]);
  }
}

// Ground truth 2: what the tracked manifests record (catches a manifest
// written ahead of / behind the working tree).
for (const f of readdirSync(MANIFESTS)) {
  if (!f.endsWith('.json') || f === 'summary.json') continue;
  const m = JSON.parse(readFileSync(path.join(MANIFESTS, f), 'utf8'));
  const diags = Array.isArray(m) ? m : m.diagrams || m.entries || [];
  for (const d of diags) {
    if (!d.mermaidSrc) continue;
    const base = path.basename(d.mermaidSrc).replace(/\.svg$/, '');
    if (/^[0-9a-f]{12}$/.test(base)) referenced.add(base);
  }
}

const onDisk = readdirSync(IMG_DIR).filter((f) => /^[0-9a-f]{12}\.svg$/.test(f));
const orphans = onDisk.filter((f) => !referenced.has(f.replace(/\.svg$/, '')));

console.log(`On-disk hash SVGs: ${onDisk.length}`);
console.log(`Referenced hashes: ${referenced.size}`);
console.log(`Orphaned: ${orphans.length}${DELETE ? '' : ' (dry-run — pass --delete)'}`);

if (DELETE) {
  let deleted = 0;
  for (const f of orphans) {
    unlinkSync(path.join(IMG_DIR, f));
    deleted++;
  }
  console.log(`Deleted: ${deleted}`);
} else if (orphans.length && orphans.length <= 40) {
  orphans.forEach((f) => console.log('  -', f));
}
