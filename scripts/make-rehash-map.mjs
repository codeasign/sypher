#!/usr/bin/env node
// Builds a wire-mermaid-rehash.mjs map file from {id, mmdFile} pairs by
// computing each source's content hash (same sha256[:12] rule as
// check-landscape-band.mjs and render-mermaid-manifest.mjs).
//
// Usage:
//   node scripts/make-rehash-map.mjs <pairs.json> <out-map.json>
//   pairs.json: [ { "id": "...", "mmdFile": ".cache/ascii-to-mermaid/x.mmd" }, ... ]

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const [pairsPath, outPath] = process.argv.slice(2);
if (!pairsPath || !outPath) {
  console.error('Usage: node scripts/make-rehash-map.mjs <pairs.json> <out-map.json>');
  process.exit(1);
}

const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const map = pairs.map(({ id, mmdFile }) => {
  const abs = path.isAbsolute(mmdFile) ? mmdFile : path.join(REPO_ROOT, mmdFile);
  const hash = createHash('sha256').update(readFileSync(abs, 'utf8')).digest('hex').slice(0, 12);
  return { id, hash };
});
writeFileSync(outPath, JSON.stringify(map, null, 1), 'utf8');
console.log(`Wrote ${outPath} with ${map.length} entries`);
for (const m of map) console.log(`  ${m.id} -> ${m.hash}`);
