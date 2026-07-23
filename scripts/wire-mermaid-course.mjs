#!/usr/bin/env node
// Wires mermaidSrc into every <AsciiDiagram> across a course's .mdx files,
// matching each diagram to its rendered SVG hash via manifest.json.
// Skips anything that already has mermaidSrc. Assumes one diagram per file
// unless a diagram-count map is supplied (course-specific).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, '.cache', 'ascii-to-mermaid-images', 'manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const hashByMmd = new Map(manifest.map(e => [e.mmdFile.replace(/\.mmd$/, ''), e.hash]));

// file -> mmd-slug (matches how each batch agent named its .mmd file)
const targets = JSON.parse(readFileSync(process.argv[2], 'utf8'));

let wired = 0, alreadyDone = 0, missingHash = 0;

for (const { file, slug } of targets) {
  const fullPath = path.join(REPO_ROOT, file);
  let content = readFileSync(fullPath, 'utf8');

  if (content.includes('mermaidSrc=')) { alreadyDone++; continue; }

  const hash = hashByMmd.get(slug);
  if (!hash) { console.log(`MISSING HASH for ${slug} (${file})`); missingHash++; continue; }

  const re = /(<AsciiDiagram\b(?:\s+[a-zA-Z_-]+=(?:"[^"]*"|\{[^}]*\}))*)(\s+content=)/;
  if (!re.test(content)) {
    console.log(`NO MATCH (opening-tag pattern) in ${file}`);
    continue;
  }
  content = content.replace(re, (whole, attrs, contentPart) => `${attrs}\n  mermaidSrc="/img/diagrams/${hash}.svg"${contentPart}`);
  writeFileSync(fullPath, content, 'utf8');
  wired++;
  console.log(`Wired ${file} -> ${hash}.svg`);
}

console.log(`\nWired: ${wired}, already done: ${alreadyDone}, missing hash: ${missingHash}`);
