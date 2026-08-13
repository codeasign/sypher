import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const apply = process.argv.includes('--apply');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

// Matches a printf call whose format-string literal was split across two
// physical lines by an actual embedded newline byte (not an escape
// sequence) -- e.g. `printf("%d\n", x)` authored/corrupted into
// `printf("%d` <newline> `", x)`. Handles both the with-trailing-args form
// (`", args);`) and the bare empty-after-content form (`");`).
const SPLIT_PRINTF_RE = /printf\("([^"\n]*)\n([^"]*)"(\)|,)/g;

const allFiles = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
let filesChanged = 0;
let totalFixed = 0;

for (const fullPath of allFiles) {
  const relPath = fullPath.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(fullPath, 'utf8');
  if (!source.includes('printf(')) continue;

  let count = 0;
  const fixed = source.replace(SPLIT_PRINTF_RE, (match, before, after, tail) => {
    count++;
    return `printf("${before}\\\\n${after}"${tail}`;
  });

  if (count === 0) continue;
  filesChanged++;
  totalFixed += count;
  if (apply) {
    writeFileSync(fullPath, fixed, 'utf8');
    console.log(`[APPLIED] ${relPath} -- ${count} fix(es)`);
  } else {
    console.log(`[DRY-RUN] ${relPath} -- ${count} occurrence(s) would be fixed`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files changed: ${filesChanged}`);
console.log(`Total occurrences fixed: ${totalFixed}`);
