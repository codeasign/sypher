import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Scans for Go's automatic-semicolon-insertion trap: a multi-line binary
// expression where a continuation line STARTS with an operator (-, +, *, /)
// while the previous line ends with a valid statement-final token
// (identifier/`]`/`)`) -- Go inserts a semicolon after the first line,
// silently splitting the expression into separate (usually invalid)
// statements. Confirmed via a real audit run against
// prefix-sum/range-sum-query-2d.mdx's go solutions-page code.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function extractGoBlocks(source) {
  const blocks = [];
  // JSX template-literal form: go: `...`
  const jsxRe = /\bgo:\s*`([\s\S]*?)`(?=\s*[,}])/g;
  let m;
  while ((m = jsxRe.exec(source))) blocks.push(m[1]);
  // Markdown fenced form: ```go ... ```
  const fenceRe = /```go\n([\s\S]*?)```/g;
  while ((m = fenceRe.exec(source))) blocks.push(m[1]);
  return blocks;
}

const LEADING_OP_RE = /^\s*[-+*/](?!\/)\s*\S/;
const TRAILING_OK_RE = /[\w\]\)]\s*(\/\/.*)?$/;

const files = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
let flagged = 0;

for (const full of files) {
  const relPath = full.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(full, 'utf8');
  if (!/\bgo:\s*`|```go/.test(source)) continue;
  const blocks = extractGoBlocks(source);
  for (const block of blocks) {
    const lines = block.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const cur = lines[i];
      const prev = lines[i - 1];
      if (LEADING_OP_RE.test(cur) && TRAILING_OK_RE.test(prev) && !/^\s*\/\//.test(prev.trim())) {
        console.log(`[SUSPECT] ${relPath}`);
        console.log(`    prev: ${prev.trim()}`);
        console.log(`    cur:  ${cur.trim()}`);
        flagged++;
      }
    }
  }
}

console.log(`\n=== SUMMARY: ${flagged} suspect occurrence(s) ===`);
