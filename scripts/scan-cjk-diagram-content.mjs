#!/usr/bin/env node
// Scans diagram sources (.mmd cache files) and docs pages for CJK
// characters — the project requires zero Chinese/Japanese/Korean glyphs
// anywhere in diagram content (user rule 2026-08-25).
//
// Usage: node scripts/scan-cjk-diagram-content.mjs

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MMD_DIR = path.join(REPO_ROOT, '.cache', 'ascii-to-mermaid');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');
// CJK unified ideographs + extensions, kana, hangul, CJK punctuation, fullwidth forms
const CJK = /[　-〿぀-ヿ㐀-䶿一-鿿가-힯＀-￯]/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let mmdHits = 0;
for (const f of walk(MMD_DIR)) {
  const src = readFileSync(f, 'utf8');
  const m = src.match(new RegExp(CJK, 'g'));
  if (m) {
    mmdHits++;
    console.log(`MMD  ${path.relative(REPO_ROOT, f)}  (${m.length} chars: ${[...new Set(m)].join(' ')})`);
  }
}

let docHits = 0;
for (const f of walk(DOCS_ROOT)) {
  if (!/\.(mdx|md)$/.test(f)) continue;
  const src = readFileSync(f, 'utf8');
  const m = src.match(new RegExp(CJK, 'g'));
  if (m) {
    docHits++;
    console.log(`DOC  ${path.relative(REPO_ROOT, f)}  (${m.length} chars: ${[...new Set(m)].slice(0, 10).join(' ')})`);
  }
}

console.log(`\nFiles with CJK: ${mmdHits} .mmd, ${docHits} docs pages`);
