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

function findCKeySpan(source, harnessStart, harnessEnd) {
  const region = source.slice(harnessStart, harnessEnd);
  const keyMatch = region.match(/(?:^|[,{]\s*)c:\s*`/);
  if (!keyMatch) return null;
  const backtickPos = harnessStart + keyMatch.index + keyMatch[0].length - 1;
  let i = backtickPos + 1;
  for (; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '`') break;
  }
  return { start: backtickPos + 1, end: i };
}

// Character-by-character scan tracking real escape state (a backslash
// toggles "the next char is escaped", so \\n" is NOT touched -- only a
// genuinely single, unescaped backslash immediately followed by n" gets
// doubled). Far more reliable than a regex at this scale/risk level.
function fixSingleBackslashN(text) {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      const next = text[i + 1];
      if (next === '\\') {
        // Already an escaped backslash pair -- copy both verbatim, untouched.
        out += '\\\\';
        i += 2;
        continue;
      }
      if (next === 'n') {
        // A single backslash immediately followed by 'n' -- there is no
        // legitimate C syntax where this two-character sequence means
        // anything other than a newline escape (it only ever appears
        // inside string/char literals), so this is always the fix,
        // regardless of where in the block it falls (format-string end,
        // mid-string like "%[^\n]", strcspn's char-set arg, etc).
        out += '\\\\n';
        i += 2;
        count++;
        continue;
      }
      // Any other single-backslash escape (\", \t, etc.) -- copy verbatim.
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
  if (!source.includes('printf(')) continue; // fast pre-filter, avoids running the full scan on every file
  const harnessProp = extractPropRawValue(source, 'harness');
  if (!harnessProp) { skipped.push({ relPath, reason: 'no harness prop found' }); continue; }
  const cSpan = findCKeySpan(source, harnessProp.start, harnessProp.end);
  if (!cSpan) { skipped.push({ relPath, reason: 'no c: key found in harness' }); continue; }

  const before = source.slice(cSpan.start, cSpan.end);
  const { text: after, count } = fixSingleBackslashN(before);

  if (count === 0) { skipped.push({ relPath, reason: 'no broken pattern found in c: block' }); continue; }

  totalReplacements += count;
  filesChanged++;

  if (apply) {
    const newSource = source.slice(0, cSpan.start) + after + source.slice(cSpan.end);
    writeFileSync(fullPath, newSource, 'utf8');
    console.log(`[APPLIED] ${relPath} -- ${count} fix(es)`);
  } else {
    console.log(`[DRY-RUN] ${relPath} -- ${count} occurrence(s) would be fixed`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files changed: ${filesChanged}`);
console.log(`Total occurrences fixed: ${totalReplacements}`);
console.log(`Skipped: ${skipped.length}`);
if (skipped.length) {
  console.log(JSON.stringify(skipped, null, 2));
}
