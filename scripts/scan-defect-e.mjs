#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'docs';

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
let realDefects = 0;
let benign = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  // Match <AsciiDiagram ...> ... </AsciiDiagram> pairs. Attribute matching is
  // quote-aware so a literal ">" inside an attribute value (e.g. an arrow
  // like "step 1 -> step 2" in alt=/title=) doesn't get mistaken for the
  // tag's real closing ">".
  const re = /<AsciiDiagram\b((?:\s+[a-zA-Z_-]+=(?:"[^"]*"|\{[^}]*\}))*)\s*>([\s\S]*?)<\/AsciiDiagram>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const openAttrs = m[1];
    const hasContentProp = /\bcontent\s*=\s*\{/.test(openAttrs);
    if (!hasContentProp) {
      realDefects++;
      const lineNo = content.slice(0, m.index).split('\n').length;
      console.log(`DEFECT-E: ${file}:${lineNo}`);
    } else {
      benign++;
    }
  }
}

console.log(`\nTotal real Defect-E (children pattern, no content= prop): ${realDefects}`);
console.log(`Total benign (content= prop + explicit </AsciiDiagram> close, valid JSX): ${benign}`);
