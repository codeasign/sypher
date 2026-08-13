#!/usr/bin/env node
// Judge0/RapidAPI migration: tags the first 2 test cases of every
// well-formed coding-bootcamp exercise as isSample:true. CoreEditor's "Run"
// button sends only isSample cases; "Submit" sends the full suite.
//
// A file is malformed (skipped) iff parsing finds zero `{ stdin: ... }`
// entries right after `testCases={[` -- e.g. the 4 greedy exercises that use
// a completely different { input: {...}, expected: {...} } shape. Detected
// structurally, not via a hardcoded filename list.
//
// Entries and the array's closing `]}` are found via a sequential parser
// (parseEntries below), not a single greedy/non-greedy regex spanning the
// whole block -- a naive `/\]\}/ ` search for the array's end breaks on any
// bracket-matching problem whose stdin value itself contains the literal
// substring "]}" (e.g. valid-parentheses.mdx has `stdin: '{[]}\n'`), and a
// naive `[^}]*` entry body breaks the same way on any value containing `{`
// or `}` (e.g. `stdin: '()[]{}\n'`). Matching full quoted string literals
// instead of "everything until the next raw brace" avoids both.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(import.meta.dirname, '..', 'apps/docs/docs/coding-bootcamp');
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

const STRING = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"`;
const ENTRY_SOURCE =
  `\\{\\s*stdin\\s*:\\s*(?:${STRING})\\s*,\\s*expectedOutput\\s*:\\s*(?:${STRING})\\s*(?:,\\s*isSample\\s*:\\s*true\\s*)?\\}`;

// Sequentially consumes complete entries starting at `startIndex` (right
// after `testCases={[`), stopping at the top-level `]}` -- never at a `]}`
// substring embedded inside an entry's own string values, since each step
// only advances past a fully-matched entry or whitespace/comma.
function parseEntries(src, startIndex) {
  const entryRe = new RegExp(ENTRY_SOURCE, 'y');
  const entries = [];
  let i = startIndex;
  for (;;) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src.startsWith(']}', i)) return { entries, endIndex: i + 2 };
    if (src[i] === ',') { i++; continue; }
    entryRe.lastIndex = i;
    const m = entryRe.exec(src);
    if (!m || m.index !== i) return { entries, endIndex: null }; // parse failed / different shape
    entries.push({ text: m[0], start: i, end: entryRe.lastIndex });
    i = entryRe.lastIndex;
  }
}

function tagEntry(entryText) {
  return entryText.replace(/\}\s*$/, ', isSample: true }');
}

function processFile(file) {
  const src = readFileSync(file, 'utf8');
  const marker = 'testCases={[';
  const markerIndex = src.indexOf(marker);
  if (markerIndex === -1) return { file, status: 'no-testcases-block' };

  const { entries, endIndex } = parseEntries(src, markerIndex + marker.length);
  if (endIndex === null) {
    // Either a genuinely different shape (0 entries -- the greedy files),
    // or something parseable-but-unexpected partway through (entries.length
    // > 0 but never reached a clean `]}`) -- both need a human look, but the
    // latter is flagged distinctly since it's a parser gap, not a known shape.
    return { file, status: 'malformed', entryCount: entries.length, incomplete: entries.length > 0 };
  }
  if (entries.length === 0) {
    return { file, status: 'malformed', entryCount: 0 };
  }

  if (entries[0].text.includes('isSample')) {
    return { file, status: 'already-tagged' };
  }

  // Tag up to 2 -- files with only 1 test case total get that 1 tagged, so
  // Run isn't left with zero cases to execute (Run and Submit end up
  // identical for those, which is correct given there's nothing to split).
  const sampleCount = Math.min(2, entries.length);
  let after = src;
  // Apply from the end backwards so earlier entries' start/end offsets stay valid.
  for (let idx = sampleCount - 1; idx >= 0; idx--) {
    const e = entries[idx];
    after = after.slice(0, e.start) + tagEntry(e.text) + after.slice(e.end);
  }

  return {
    file,
    status: 'tagged',
    entryCount: entries.length,
    before: entries.slice(0, sampleCount).map((e) => e.text),
    after,
  };
}

const files = walk(ROOT);
const results = files.map(processFile);

const tagged = results.filter((r) => r.status === 'tagged');
const malformed = results.filter((r) => r.status === 'malformed');
const alreadyTagged = results.filter((r) => r.status === 'already-tagged');
const noBlock = results.filter((r) => r.status === 'no-testcases-block');

for (const r of malformed) {
  const note = r.incomplete ? 'parse stopped partway through -- needs manual review' : `${r.entryCount} stdin-entries found`;
  console.log(`SKIP (malformed, ${note}): ${r.file}`);
}
for (const r of alreadyTagged) {
  console.log(`NOCHANGE (already tagged): ${r.file}`);
}

for (const r of tagged) {
  if (DRY_RUN) {
    console.log(`[dry-run] would tag ${r.file} (${r.entryCount} test cases, ${r.before.length} tagged as sample):`);
    for (const entry of r.before) {
      console.log(`  - ${entry}`);
      console.log(`  + ${tagEntry(entry)}`);
    }
  } else {
    writeFileSync(r.file, r.after, 'utf8');
    console.log(`OK: tagged first ${r.before.length} test case(s) in ${r.file}`);
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}${tagged.length} ${DRY_RUN ? 'would be tagged' : 'tagged'}, ` +
  `${alreadyTagged.length} already tagged, ${malformed.length} malformed (skipped), ` +
  `${noBlock.length} had no testCases block, out of ${files.length} .mdx files scanned.`
);
