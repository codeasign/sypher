#!/usr/bin/env node
// Judge0/RapidAPI migration follow-up: RapidAPI's TypeScript runtime has no
// @types/node installed, so `require`/`process` fail to resolve at
// compile-time (confirmed via direct RapidAPI testing, 2026-08). Fix is two
// inline ambient declarations prepended to every typescript harness:
//   declare function require(name: string): any;
//   declare const process: any;
// (The companion `--lib es2015,dom` compiler_options fix for Set/Map lives
// in apps/app/src/lib/judge0Client.ts, not here -- that's a per-submission
// request field, not something authored content can carry.)
//
// A minority of harnesses (45 of 187) use `import * as readline from
// 'readline';` instead of `require('readline')` -- TypeScript can't resolve
// the 'readline' module without @types/node either way, and a shorthand
// `declare module 'readline';` didn't work cleanly against this TS version
// (3.7.4) when tested directly. Normalizing those to the same
// `const readline = require('readline');` shape used everywhere else (also
// verified working) means one consistent fix instead of two, so this script
// normalizes first, then prepends the same two declare lines regardless of
// which style a file started with.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'apps/docs/docs/coding-bootcamp');
const DRY_RUN = process.argv.includes('--dry-run');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.mdx')) out.push(p);
  }
  return out;
}

// Finds the `typescript: \`...\`` entry inside the harness block, returning
// the content's [start, end) offsets in the original file (escape-aware, so
// a literal backtick inside the harness code doesn't truncate the match).
function findTypeScriptHarnessEntry(src) {
  const marker = 'harness={{';
  const markerIdx = src.indexOf(marker);
  if (markerIdx === -1) return null;
  const keyMarker = '\n    typescript: `';
  const keyIdx = src.indexOf(keyMarker, markerIdx);
  if (keyIdx === -1) return null;
  const contentStart = keyIdx + keyMarker.length;
  let i = contentStart;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') break;
    i++;
  }
  return { start: contentStart, end: i };
}

const REQUIRE_RE = /const\s+readline\s*=\s*require\(['"]readline['"]\);/;
const IMPORT_RE = /(?:import|\\u0069mport)\s*\*\s*as\s+readline\s+from\s+['"]readline['"];/;
const ALREADY_DECLARED_RE = /declare\s+function\s+require|declare\s+const\s+process/;

const DECLARE_LINES = `declare function require(name: string): any;
declare const process: any;
`;

function processFile(file) {
  const src = readFileSync(file, 'utf8');
  const entryPos = findTypeScriptHarnessEntry(src);
  if (!entryPos) return { file, status: 'no-typescript-harness' };

  const entryText = src.slice(entryPos.start, entryPos.end);
  if (ALREADY_DECLARED_RE.test(entryText)) return { file, status: 'already-declared' };

  let fixedEntry = entryText;
  let changeType;
  if (IMPORT_RE.test(fixedEntry)) {
    fixedEntry = fixedEntry.replace(IMPORT_RE, "const readline = require('readline');");
    changeType = 'normalized-and-declared';
  } else if (REQUIRE_RE.test(fixedEntry)) {
    changeType = 'declared';
  } else {
    return { file, status: 'unrecognized-shape' };
  }
  fixedEntry = DECLARE_LINES + fixedEntry;

  const after = src.slice(0, entryPos.start) + fixedEntry + src.slice(entryPos.end);
  return { file, status: 'fixed', changeType, before: entryText, after };
}

const files = walk(ROOT);
const results = files.map(processFile);

const fixed = results.filter((r) => r.status === 'fixed');
const unrecognized = results.filter((r) => r.status === 'unrecognized-shape');
const alreadyDeclared = results.filter((r) => r.status === 'already-declared');

for (const r of unrecognized) {
  console.log(`SKIP (unrecognized shape -- needs manual review): ${r.file}`);
}
for (const r of alreadyDeclared) {
  console.log(`NOCHANGE (already declared): ${r.file}`);
}

const declaredOnly = fixed.filter((r) => r.changeType === 'declared').length;
const normalized = fixed.filter((r) => r.changeType === 'normalized-and-declared').length;

for (const r of fixed) {
  if (DRY_RUN) {
    console.log(`[dry-run] would fix (${r.changeType}): ${r.file}`);
  } else {
    writeFileSync(r.file, r.after, 'utf8');
    console.log(`OK: fixed (${r.changeType}): ${r.file}`);
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}${fixed.length} ${DRY_RUN ? 'would be fixed' : 'fixed'} ` +
  `(${declaredOnly} declare-only, ${normalized} normalized+declared), ` +
  `${alreadyDeclared.length} already declared, ${unrecognized.length} unrecognized shape, ` +
  `out of ${files.length} .mdx files scanned.`
);
