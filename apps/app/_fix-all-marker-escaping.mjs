import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Comprehensive, all-language version of _fix-c-marker-escaping.mjs and
// _fix-go-marker-escaping.mjs: a single backslash immediately followed by
// `n` inside ANY harness/starterCode template-literal string, for ANY
// language key, is parsed by Babel as a literal embedded newline byte, not
// the two-character escape `\n`. Confirmed independently in C, Go, and now
// Python (`sys.stdin.read().rstrip('\n')` split across two physical lines).
// Rather than keep finding these one exercise at a time, this fixes every
// language key in both JSX props in one pass.
const apply = process.argv.includes('--apply');

const LANG_KEYS = [
  'python', 'python27', 'javascript', 'typescript', 'java',
  'cpp', 'cpp14', 'cpp83', 'c', 'c_gcc7', 'c_gcc8',
  'csharp', 'rust', 'go', 'kotlin',
];

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

function findKeySpan(source, regionStart, regionEnd, key) {
  const region = source.slice(regionStart, regionEnd);
  const keyRe = new RegExp(`(?:^|[,{]\\s*)${key}:\\s*\``);
  const keyMatch = region.match(keyRe);
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
const perFileDetail = [];

for (const fullPath of allFiles) {
  const relPath = fullPath.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  let source = readFileSync(fullPath, 'utf8');

  let fileCount = 0;
  const fixedKeys = [];

  for (const propName of ['harness', 'starterCode']) {
    // Re-extract the prop span fresh each key iteration since earlier fixes
    // shift string offsets within `source`.
    for (const key of LANG_KEYS) {
      const prop = extractPropRawValue(source, propName);
      if (!prop) continue;
      const span = findKeySpan(source, prop.start, prop.end, key);
      if (!span) continue;
      const before = source.slice(span.start, span.end);
      const { text: after, count } = fixSingleBackslashN(before);
      if (count === 0) continue;
      fileCount += count;
      fixedKeys.push(`${propName}.${key}(${count})`);
      source = source.slice(0, span.start) + after + source.slice(span.end);
    }
  }

  if (fileCount === 0) continue;

  totalReplacements += fileCount;
  filesChanged++;
  perFileDetail.push({ relPath, fileCount, fixedKeys });

  if (apply) {
    writeFileSync(fullPath, source, 'utf8');
    console.log(`[APPLIED] ${relPath} -- ${fileCount} fix(es) [${fixedKeys.join(', ')}]`);
  } else {
    console.log(`[DRY-RUN] ${relPath} -- ${fileCount} occurrence(s) would be fixed [${fixedKeys.join(', ')}]`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files changed: ${filesChanged}`);
console.log(`Total occurrences fixed: ${totalReplacements}`);
