#!/usr/bin/env node
// Updates an existing mermaidSrc to the current hash for each target
// (content changed since last wiring, so the hash changed too).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, '.cache', 'ascii-to-mermaid-images', 'manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const hashByMmd = new Map(manifest.map(e => [e.mmdFile.replace(/\.mmd$/, ''), e.hash]));

const targets = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let updated = 0, unchanged = 0, missing = 0;

for (const { file, slug } of targets) {
  const fullPath = path.join(REPO_ROOT, file);
  let content = readFileSync(fullPath, 'utf8');
  const hash = hashByMmd.get(slug);
  if (!hash) { console.log(`MISSING HASH for ${slug}`); missing++; continue; }

  const re = /mermaidSrc="\/img\/diagrams\/[a-f0-9]+\.svg"/;
  const newValue = `mermaidSrc="/img/diagrams/${hash}.svg"`;
  const m = content.match(re);
  if (!m) { console.log(`NO mermaidSrc FOUND in ${file}`); continue; }
  if (m[0] === newValue) { unchanged++; continue; }

  content = content.replace(re, newValue);
  writeFileSync(fullPath, content, 'utf8');
  updated++;
  console.log(`Updated ${file}: ${m[0]} -> ${newValue}`);
}

console.log(`\nUpdated: ${updated}, unchanged (same hash): ${unchanged}, missing: ${missing}`);
