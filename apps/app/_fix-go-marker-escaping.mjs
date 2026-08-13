import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Same bug class as _fix-c-marker-escaping.mjs, but for the `go:` harness
// key: a single backslash immediately followed by `n` inside a JS template
// literal is parsed by Babel as a literal embedded newline byte, not the
// two-character escape `\n` -- which corrupts any Go string/rune literal
// spanning that point (`fmt.Printf("...\n", ...)`, `'\n'` rune literals,
// etc), producing "newline in string"/"newline in rune literal" syntax
// errors. Confirmed via a real audit run against arrays/two-sum.mdx and
// sliding-window/longest-repeating-character-replacement.mdx, 2026-08.
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

function extractPropRawValue(source, propName) {
  const marker = `${propName}={`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const open = start + propName.length + 1;
  let i = open;
  let depth = 0;
  let inString = null;
  let close = -1;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { close = i; break; } }
  }
  if (close === -1) return null;
  return { start: open + 1, end: close };
}

function findGoKeySpan(source, regionStart, regionEnd) {
  const region = source.slice(regionStart, regionEnd);
  const keyMatch = region.match(/(?:^|[,{]\s*)go:\s*`/);
  if (!keyMatch) return null;
  const backtickPos = regionStart + keyMatch.index + keyMatch[0].length - 1;
  let i = backtickPos + 1;
  for (; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '`') break;
  }
  return { start: backtickPos + 1, end: i };
}

function fixSingleBackslashN(text) {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      const next = text[i + 1];
      if (next === '\\') {
        out += '\\\\';
        i += 2;
        continue;
      }
      if (next === 'n') {
        out += '\\\\n';
        i += 2;
        count++;
        continue;
      }
      out += ch + (next ?? '');
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return { text: out, count };
}

const allFiles = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
console.log(`Scanning ${allFiles.length} .mdx files.`);

let filesChanged = 0;
let totalReplacements = 0;
const skipped = [];

for (const fullPath of allFiles) {
  const relPath = fullPath.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(fullPath, 'utf8');
  if (!/\bgo:\s*`/.test(source)) continue;

  let newSource = source;
  let fileCount = 0;

  for (const propName of ['harness', 'starterCode']) {
    const prop = extractPropRawValue(newSource, propName);
    if (!prop) continue;
    const goSpan = findGoKeySpan(newSource, prop.start, prop.end);
    if (!goSpan) continue;
    const before = newSource.slice(goSpan.start, goSpan.end);
    const { text: after, count } = fixSingleBackslashN(before);
    if (count === 0) continue;
    fileCount += count;
    newSource = newSource.slice(0, goSpan.start) + after + newSource.slice(goSpan.end);
  }

  if (fileCount === 0) { skipped.push(relPath); continue; }

  totalReplacements += fileCount;
  filesChanged++;

  if (apply) {
    writeFileSync(fullPath, newSource, 'utf8');
    console.log(`[APPLIED] ${relPath} -- ${fileCount} fix(es)`);
  } else {
    console.log(`[DRY-RUN] ${relPath} -- ${fileCount} occurrence(s) would be fixed`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files changed: ${filesChanged}`);
console.log(`Total occurrences fixed: ${totalReplacements}`);
