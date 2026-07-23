#!/usr/bin/env node
// Fixes Defect E: <AsciiDiagram ...>{`...`}</AsciiDiagram> (children pattern,
// renders empty) -> <AsciiDiagram ... content={`...`} /> (content prop, renders).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'docs';
const DRY_RUN = process.argv.includes('--dry-run');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.mdx') || entry.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let totalFixed = 0;
let totalSkipped = 0;
let filesChanged = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let content = original;
  let fixedInFile = 0;
  let skippedInFile = 0;

  content = content.replace(
    /<AsciiDiagram\b((?:\s+[a-zA-Z_-]+=(?:"[^"]*"|\{[^}]*\}))*)\s*>([\s\S]*?)<\/AsciiDiagram>/g,
    (whole, attrs, children) => {
      if (/\bcontent\s*=\s*\{/.test(attrs)) {
        // Already has content= prop, explicit close is valid JSX — leave it.
        return whole;
      }
      const trimmedChildren = children.trim();
      // Allow whitespace/newlines between the opening `{` and the backtick,
      // and between the closing backtick and `}` — purely cosmetic variance.
      const isCleanTemplateLiteral = /^\{\s*`[\s\S]*`\s*\}$/.test(trimmedChildren);
      if (!isCleanTemplateLiteral) {
        skippedInFile++;
        console.log(`  SKIP (unexpected children shape) in ${file}: ${JSON.stringify(trimmedChildren.slice(0, 60))}`);
        return whole;
      }
      fixedInFile++;
      const trimmedAttrs = attrs.replace(/\s+$/, '');
      return `<AsciiDiagram${trimmedAttrs}\n  content=${trimmedChildren}\n/>`;
    }
  );

  if (fixedInFile > 0) {
    filesChanged++;
    totalFixed += fixedInFile;
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}Fixed ${fixedInFile} in ${file}`);
    if (!DRY_RUN) {
      writeFileSync(file, content, 'utf8');
    }
  }
  totalSkipped += skippedInFile;
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total fixed: ${totalFixed} across ${filesChanged} files. Skipped (needs manual review): ${totalSkipped}.`);
