#!/usr/bin/env node
// Judge0/RapidAPI migration follow-up: removes starterCode entries for
// language keys that no longer have a working LANGUAGE_IDS mapping in
// CoreEditor (apps/docs/src/components/CoreEditor/Index.tsx) -- their old
// ids (csharp_mono52:17, csharp_mono54:16, java8:27, python35:35,
// python36:34, rust120:42) only existed on the old self-hosted Judge0
// Docker image and don't exist on RapidAPI's hosted instance (confirmed via
// GET /languages, 2026-08-06). Leaving them in starterCode would keep
// offering these as dropdown options that fail every time they're run.
//
// harness blocks are swept too -- most files only key harness by base
// language names, but a few (the union-find folder) also wrote separate
// harness entries for these variant-specific keys, which become dead code
// the moment their starterCode entry (and dropdown option) is gone.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'apps/docs/docs/coding-bootcamp');
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_KEYS = ['csharp_mono52', 'csharp_mono54', 'java8', 'python35', 'python36', 'rust120'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.mdx')) out.push(p);
  }
  return out;
}

// Backtick template literal, escape-aware (handles `\`` inside the value) --
// none of the 6 target languages' code syntax uses backticks, so this is
// safe even without full JS-template-expression parsing.
const ENTRY_RE = /([a-zA-Z0-9_]+)\s*:\s*`(?:[^`\\]|\\.)*`\s*,?/y;

// entry.start includes the whitespace/newline immediately preceding the
// entry (from the prior entry's end, or the block start for the first
// entry) -- so removing a target entry's [start, end) span cleanly drops
// its own leading indentation/newline too, with no orphaned blank line.
function parseStarterCode(src, startIndex) {
  const entries = [];
  let i = startIndex;
  for (;;) {
    const entryStart = i;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src.startsWith('}}', i)) return { entries, endIndex: i };
    ENTRY_RE.lastIndex = i;
    const m = ENTRY_RE.exec(src);
    if (!m || m.index !== i) return { entries, endIndex: null };
    const key = m[0].match(/^[a-zA-Z0-9_]+/)[0];
    entries.push({ key, start: entryStart, end: ENTRY_RE.lastIndex });
    i = ENTRY_RE.lastIndex;
  }
}

function processFile(file) {
  let src = readFileSync(file, 'utf8');
  const removedByBlock = {};

  for (const marker of ['starterCode={{', 'harness={{']) {
    const idx = src.indexOf(marker);
    if (idx === -1) continue;

    const { entries, endIndex } = parseStarterCode(src, idx + marker.length);
    if (endIndex === null) {
      return { file, status: 'parse-failed', block: marker, entryCount: entries.length };
    }

    const toRemove = entries.filter((e) => TARGET_KEYS.includes(e.key));
    if (toRemove.length === 0) continue;

    let after = src;
    for (let k = toRemove.length - 1; k >= 0; k--) {
      const e = toRemove[k];
      after = after.slice(0, e.start) + after.slice(e.end);
    }
    src = after;
    removedByBlock[marker] = toRemove.map((e) => e.key);
  }

  const removedKeys = Object.values(removedByBlock).flat();
  if (removedKeys.length === 0) return { file, status: 'no-target-keys' };

  const summary = Object.entries(removedByBlock)
    .map(([block, keys]) => `${block.replace('={{', '')}: [${keys.join(', ')}]`)
    .join(', ');

  return { file, status: 'cleaned', summary, after: src };
}

const files = walk(ROOT);
const results = files.map(processFile);

const cleaned = results.filter((r) => r.status === 'cleaned');
const parseFailed = results.filter((r) => r.status === 'parse-failed');

for (const r of parseFailed) {
  console.log(`SKIP (parse failed in ${r.block} after ${r.entryCount} entries -- needs manual review): ${r.file}`);
}

for (const r of cleaned) {
  if (DRY_RUN) {
    console.log(`[dry-run] would remove ${r.summary} from ${r.file}`);
  } else {
    writeFileSync(r.file, r.after, 'utf8');
    console.log(`OK: removed ${r.summary} from ${r.file}`);
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}${cleaned.length} file(s) ${DRY_RUN ? 'would be' : ''} cleaned, ` +
  `${parseFailed.length} parse failure(s), out of ${files.length} .mdx files scanned.`
);
