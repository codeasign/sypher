#!/usr/bin/env node
// Wires mermaidSrc into the Nth <AsciiDiagram> in a file (1-based, source
// order), for files with multiple diagrams. Skips any AsciiDiagram that
// already has mermaidSrc. Targets: [{file, slug, index}] where index is
// the 1-based position of the diagram within the file.
//
// Only matches attributes up to "content=" (not through the content value
// itself) since ASCII-art content can contain stray "}" that would break a
// naive attribute-parsing regex.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, '.cache', 'ascii-to-mermaid-images', 'manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const hashByMmd = new Map(manifest.map(e => [e.mmdFile.replace(/\.mmd$/, ''), e.hash]));

const targets = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byFile = new Map();
for (const t of targets) {
  if (!byFile.has(t.file)) byFile.set(t.file, []);
  byFile.get(t.file).push(t);
}

let wired = 0, alreadyDone = 0, missingHash = 0;

// Matches an <AsciiDiagram ...> opening up through the attrs preceding
// "content=". Each match's index (occurrence count) maps to diagram
// position in source order.
const OPEN_RE = /<AsciiDiagram\b((?:\s+[a-zA-Z_-]+=(?:"[^"]*"|\{[^{}]*\}))*)(\s+content=)/g;

for (const [file, items] of byFile) {
  const fullPath = path.join(REPO_ROOT, file);
  let content = readFileSync(fullPath, 'utf8');

  let idx = 0;
  content = content.replace(OPEN_RE, (whole, attrs, contentPart) => {
    idx++;
    const item = items.find(i => i.index === idx);
    if (!item) return whole;
    if (/\bmermaidSrc\s*=/.test(attrs)) { alreadyDone++; return whole; }
    const hash = hashByMmd.get(item.slug);
    if (!hash) { console.log(`MISSING HASH for ${item.slug}`); missingHash++; return whole; }
    wired++;
    return `<AsciiDiagram${attrs}\n  mermaidSrc="/img/diagrams/${hash}.svg"${contentPart}`;
  });

  writeFileSync(fullPath, content, 'utf8');
}

console.log(`\nWired: ${wired}, already done: ${alreadyDone}, missing hash: ${missingHash}`);
