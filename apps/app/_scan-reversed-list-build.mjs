import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Generic heuristic for the "forward-scan-while-prepending" linked-list-build
// bug: within an ascending for-loop, a line `X.next = Y;` (or `X->next = Y;`)
// immediately followed by `Y = X;` -- i.e. prepending a newly-built node onto
// a running head/tail-style variable while scanning input in ascending order,
// which silently reverses the list. Correct patterns iterate descending
// (`i = n - 1; i >= 0; i--`), reverse an already-read array (`.rev()`/
// `reversed(...)`), or append via a separately-tracked tail pointer instead
// of reassigning the same variable that was just read as `.next`'s target.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const ASSIGN_RE = /(\w+)(?:->|\.)next\s*=\s*(\w+)\s*;?\s*$/;

const files = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
let flagged = 0;

for (const full of files) {
  const relPath = full.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(full, 'utf8');
  const lines = source.split('\n');
  for (let li = 0; li < lines.length - 1; li++) {
    const m = ASSIGN_RE.exec(lines[li]);
    if (!m) continue;
    const [, nodeVar, targetVar] = m;
    if (nodeVar === targetVar) continue; // e.g. `dummy.next = dummy.next;` noop, skip
    // next non-blank line must reassign targetVar := nodeVar
    let nextLine = null;
    for (let ni = li + 1; ni < Math.min(lines.length, li + 3); ni++) {
      if (lines[ni].trim() !== '') { nextLine = lines[ni]; break; }
    }
    if (!nextLine) continue;
    const reassignRe = new RegExp(`\\b${targetVar}\\s*=\\s*${nodeVar}\\s*;?\\s*$`);
    if (!reassignRe.test(nextLine)) continue;

    // Walk backward up to 15 lines to find the nearest enclosing `for (`.
    let forLine = null;
    for (let bi = li; bi >= Math.max(0, li - 15); bi--) {
      if (/for\s*\(|for\s+\w+\s+in\s+/.test(lines[bi])) { forLine = lines[bi]; break; }
    }
    if (!forLine) continue;
    const descending = /-\s*1\s*;.*>=\s*0/.test(forLine) || /range\([^)]*,\s*-1\s*,\s*-1\)/.test(forLine);
    const usesRevIter = /\.rev\(\)|reversed\(/.test(lines.slice(Math.max(0, li - 15), li + 1).join('\n'));
    const provenSafe = descending || usesRevIter;
    if (!provenSafe) {
      console.log(`[SUSPECT] ${relPath}:${li + 1}`);
      console.log(`    for-line: ${forLine.trim()}`);
      console.log(`    assign:   ${lines[li].trim()}`);
      console.log(`    reassign: ${nextLine.trim()}`);
      flagged++;
    }
  }
}

console.log(`\n=== SUMMARY: ${flagged} suspect occurrence(s) ===`);
