import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Solutions pages use markdown fenced code blocks (```lang ... ```), not JSX
// template literals, so they were never exposed to the Babel single-
// backslash-n escaping bug -- the fenced-block content is not parsed as a JS
// string at all, just embedded raw markdown/HTML. This script exists purely
// to double-check that assumption empirically rather than take it on faith:
// it looks for genuinely SPLIT string/format literals (an unterminated quote
// followed by a continuation line) inside solutions-page fenced code blocks,
// which would indicate some other authoring-time corruption independent of
// the Babel mechanism.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const files = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp').filter((f) =>
  f.includes('/solutions/') || f.includes('\\solutions\\')
);
console.log(`Scanning ${files.length} solutions-page .mdx files.`);

const FENCE_RE = /```(\w+)\n([\s\S]*?)```/g;
// A quoted string literal that opens but does not close on the same line
// (naive heuristic: odd number of unescaped `"` before end of line, followed
// by more non-blank content on the next line that looks like a continuation
// of a print/format call).
const SPLIT_STRING_RE = /(printf|Printf|System\.out\.print|console\.log|print)\([^)\n]*"[^"\n]*\n[^"]*"/g;

let flagged = 0;
for (const full of files) {
  const relPath = full.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(full, 'utf8');
  let m;
  while ((m = FENCE_RE.exec(source))) {
    const [, , block] = m;
    let sm;
    SPLIT_STRING_RE.lastIndex = 0;
    while ((sm = SPLIT_STRING_RE.exec(block))) {
      console.log(`[SUSPECT] ${relPath}`);
      console.log(`    ${sm[0].slice(0, 120).replace(/\n/g, '\\n')}`);
      flagged++;
    }
  }
}
console.log(`\n=== SUMMARY: ${flagged} suspect occurrence(s) ===`);
