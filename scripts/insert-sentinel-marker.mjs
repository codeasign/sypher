// Dry-run / apply tool for inserting the sentinel grading marker into every
// harness={{ ... }} entry across coding-bootcamp problem .mdx files.
//
// Algorithm: find the language's "entry span" (main()-like function, or a
// streaming callback idiom for JS/TS), then walk its direct-child top-level
// statements (brace-depth-tracked for C-like languages, indentation-tracked
// for Python) to find the EARLIEST one that transitively contains a print
// call. Insert the marker print immediately before that statement, at its
// own depth. Everything from that statement onward -- however many
// separate print calls, loops, or branches it contains -- becomes the
// graded segment, so a single anchor point is sufficient; no need to find
// or dedupe every individual print call.
//
// Usage:
//   node scripts/insert-sentinel-marker.mjs --lang go --dry-run
//   node scripts/insert-sentinel-marker.mjs --lang go            (apply)

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
const MARKER = '###SYPHER_JUDGE0_RESULT###';

const args = process.argv.slice(2);
const langArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const dryRun = args.includes('--dry-run') || !args.includes('--apply');
const onlyFile = args.includes('--only-file') ? args[args.indexOf('--only-file') + 1] : null;

const PRINT_PATTERNS = {
  go: /\bfmt\.(Print|Println|Printf|Fprint|Fprintln|Fprintf)\s*\(/,
  java: /\bSystem\.out\.(print|println|printf)\s*\(/,
  python: /((^|\s)print\s*\(|sys\.stdout\.write\s*\()/,
  python27: /(^|\s)print\b/,
  javascript: /\bconsole\.log\s*\(/,
  typescript: /\bconsole\.log\s*\(/,
  csharp: /\bConsole\.(Write|WriteLine)\s*\(/,
  cpp: /\b(printf\s*\(|std::cout\s*<<|cout\s*<<)/,
  cpp14: /\b(printf\s*\(|std::cout\s*<<|cout\s*<<)/,
  cpp83: /\b(printf\s*\(|std::cout\s*<<|cout\s*<<)/,
  c: /\bprintf\s*\(/,
  c_gcc7: /\bprintf\s*\(/,
  c_gcc8: /\bprintf\s*\(/,
  rust: /\bprintln!\s*\(/,
  kotlin: /\bprintln?\s*\(/,
};

// Language -> regex matching the START LINE of the entry function/span,
// and a flag for whether it's brace-delimited (walk by brace depth) or
// indentation-delimited (Python).
const ENTRY_PATTERNS = {
  go: { re: /^func\s+main\s*\(\s*\)\s*\{/, kind: 'brace' },
  java: { re: /\bpublic\s+static\s+void\s+main\s*\([^)]*\)(\s+throws\s+[\w.]+(\s*,\s*[\w.]+)*)?\s*\{/, kind: 'brace' },
  csharp: { re: /\bstatic\s+(async\s+)?(Task\s*)?void\s+Main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  cpp: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  cpp14: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  cpp83: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  c: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  c_gcc7: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  c_gcc8: { re: /\bint\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  rust: { re: /\bfn\s+main\s*\(\s*\)\s*\{/, kind: 'brace' },
  kotlin: { re: /\bfun\s+main\s*\([^)]*\)\s*\{/, kind: 'brace' },
  // Two idioms in this codebase: a streaming shape that accumulates state
  // across multiple 'line' events and only produces output in 'close'
  // (the correct anchor there -- 'line' handlers in that shape don't print),
  // and a simpler one-shot shape where the ENTIRE read-compute-print
  // happens inside a single 'line' handler with no 'close' handler at all.
  // Try 'close' first (it's the correct anchor whenever both exist); fall
  // back to 'line' only when there's no 'close' handler to prefer.
  javascript: {
    res: [
      /\.on\s*\(\s*['"]close['"]\s*,\s*(async\s*)?(\([^)]*\)|\w+)\s*(:\s*\w+\s*)?=>\s*\{/,
      /\.on\s*\(\s*['"]line['"]\s*,\s*(async\s*)?(\([^)]*\)|\w+)\s*(:\s*\w+\s*)?=>\s*\{/,
    ],
    kind: 'brace',
  },
  typescript: {
    res: [
      /\.on\s*\(\s*['"]close['"]\s*,\s*(async\s*)?(\([^)]*\)|\w+)\s*(:\s*\w+\s*)?=>\s*\{/,
      /\.on\s*\(\s*['"]line['"]\s*,\s*(async\s*)?(\([^)]*\)|\w+)\s*(:\s*\w+\s*)?=>\s*\{/,
    ],
    kind: 'brace',
  },
};

function walkFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else if (e.endsWith('.mdx')) out.push(p);
  }
  return out;
}

// Finds the raw text of `harness={{ ... lang: `...` ... }}` for one language,
// plus its absolute start/end offsets in the file (for in-place splicing).
function findHarnessEntry(src, lang) {
  const harnessIdx = src.indexOf('harness={{');
  if (harnessIdx === -1) return null;
  const keyMarker = `\n    ${lang}: \``;
  const keyIdx = src.indexOf(keyMarker, harnessIdx);
  if (keyIdx === -1) return null;
  const contentStart = keyIdx + keyMarker.length;
  let i = contentStart;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') break;
    i++;
  }
  const text = src.slice(contentStart, i);
  if (text.includes(MARKER)) return { text, start: contentStart, end: i, alreadyMarked: true };
  return { text, start: contentStart, end: i, alreadyMarked: false };
}

// Some harnesses (single-line arrow callbacks, e.g.
// `rl.on('line', (line) => { console.log(...); rl.close(); });`) have the
// ENTIRE body on the same line as the opening brace -- findBraceEntrySpan's
// line-granular chunking can't represent that. Detected separately so
// classifyEntry can splice the marker directly into the line's text
// (right after the opening brace, as the body's first statement) instead
// of inserting a new line before some body-line index.
function findSingleLineBraceBody(text, entryRe) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = entryRe.exec(line);
    if (!m) continue;
    const openIdx = line.indexOf('{', m.index);
    if (openIdx === -1) continue;
    let depth = 0;
    for (let j = openIdx; j < line.length; j++) {
      if (line[j] === '{') depth++;
      else if (line[j] === '}') {
        depth--;
        if (depth === 0) return { lineIdx: i, insertCharIdx: openIdx + 1, bodyText: line.slice(openIdx + 1, j), lines };
      }
    }
  }
  return null;
}

// The `.on('close', ...)` idiom sometimes uses an EXPRESSION-bodied arrow
// with no braces at all, e.g. `rl.on('close', () => console.log(x));` --
// findSingleLineBraceBody can't apply either (there's no `{` to work with).
// Detected by depth-scanning from the `.on(`'s own opening paren to find
// its matching close, treating everything between the arrow and that
// closing paren as the expression to wrap in a block.
function findExpressionBodyCloseHandler(text, printRe) {
  const lines = text.split('\n');
  const onRe = /\.on\s*\(\s*['"]close['"]\s*,\s*(async\s*)?(\([^)]*\)|\w+)\s*(:\s*\w+\s*)?=>\s*(?!\{)/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = onRe.exec(line);
    if (!m) continue;
    const onParenIdx = line.indexOf('(', line.indexOf('.on'));
    if (onParenIdx === -1) continue;
    let depth = 0;
    let onCloseIdx = -1;
    for (let j = onParenIdx; j < line.length; j++) {
      if (line[j] === '(') depth++;
      else if (line[j] === ')') { depth--; if (depth === 0) { onCloseIdx = j; break; } }
    }
    if (onCloseIdx === -1) continue;
    const arrowEndIdx = m.index + m[0].length;
    const exprText = line.slice(arrowEndIdx, onCloseIdx);
    if (!printRe.test(exprText)) continue;
    return { lineIdx: i, exprStart: arrowEndIdx, exprEnd: onCloseIdx, exprText, lines };
  }
  return null;
}

function findBraceEntrySpan(text, entryRe) {
  const lines = text.split('\n');
  let entryLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (entryRe.test(lines[i])) { entryLineIdx = i; break; }
  }
  if (entryLineIdx === -1) return null;
  // Depth right after the entry line's own opening brace(s).
  let depth = 0;
  const openLine = lines[entryLineIdx];
  depth += (openLine.match(/\{/g) || []).length - (openLine.match(/\}/g) || []).length;
  if (depth <= 0) return null; // malformed / brace closes same line, bail
  let endLineIdx = -1;
  for (let i = entryLineIdx + 1; i < lines.length; i++) {
    const opens = (lines[i].match(/\{/g) || []).length;
    const closes = (lines[i].match(/\}/g) || []).length;
    if (depth === 1 && closes > 0) {
      // Could close on this line; find exact point depth returns to 0 -- for
      // our line-granular purposes treat this line as the last body line if
      // it closes back to 0, else continue.
    }
    depth += opens - closes;
    if (depth <= 0) { endLineIdx = i; break; }
  }
  if (endLineIdx === -1) return null;
  return { bodyStart: entryLineIdx + 1, bodyEnd: endLineIdx, lines }; // bodyEnd exclusive
}

// Partitions the direct-child region into chunks by brace depth (relative,
// starting at 0 for direct children of the entry).
function chunkByBraceDepth(lines, bodyStart, bodyEnd) {
  const chunks = [];
  let depth = 0;
  let current = null;
  for (let i = bodyStart; i < bodyEnd; i++) {
    const line = lines[i];
    const startDepth = depth;
    if (startDepth === 0) {
      if (current) chunks.push(current);
      current = { startIdx: i, endIdx: i, text: [] };
    }
    current.text.push(line);
    current.endIdx = i;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;
  }
  if (current) chunks.push(current);
  return chunks;
}

function indentOf(line) {
  const m = line.match(/^[ \t]*/);
  return m ? m[0].length : 0;
}

// Python: chunk by indentation. Many harnesses in this codebase define a
// top-level `def main():` containing the actual driver logic, then just
// call it from `if __name__ == "__main__": main()` -- so a guard whose OWN
// body is nothing but that call has nothing for the print-search to find;
// the real content is inside the separately-defined function. Prefer
// `def main():`'s own body first (it directly contains the entry logic in
// that shape, and coincides with the guard's target); fall back to the
// guard's own body when there's no separate main() (e.g. asteroid-collision.mdx,
// whose guard directly contains the entry code); fall back further to the
// whole top-level region (excluding def/class declarations) when neither exists.
function findPythonEntrySpan(text) {
  const lines = text.split('\n');
  const mainDefIdx = lines.findIndex((l) => /^def\s+main\s*\(/.test(l));
  if (mainDefIdx !== -1) {
    const defIndent = indentOf(lines[mainDefIdx]);
    let end = lines.length;
    for (let i = mainDefIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      if (indentOf(lines[i]) <= defIndent) { end = i; break; }
    }
    return { lines, bodyStart: mainDefIdx + 1, bodyEnd: end, baseIndent: defIndent + 4 };
  }
  const mainGuardIdx = lines.findIndex((l) => /^if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(l));
  if (mainGuardIdx !== -1) {
    const guardIndent = indentOf(lines[mainGuardIdx]);
    let end = lines.length;
    for (let i = mainGuardIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      if (indentOf(lines[i]) <= guardIndent) { end = i; break; }
    }
    return { lines, bodyStart: mainGuardIdx + 1, bodyEnd: end, baseIndent: guardIndent + 4 };
  }
  // No guard: treat top-level (indent 0) executable lines as entry, skipping
  // def/class blocks (those are declarations, not the entry).
  return { lines, bodyStart: 0, bodyEnd: lines.length, baseIndent: 0, skipDefs: true };
}

function chunkByIndent(lines, bodyStart, bodyEnd, baseIndent, skipDefs) {
  const chunks = [];
  let current = null;
  let skipUntilIndentLE = null;
  for (let i = bodyStart; i < bodyEnd; i++) {
    const line = lines[i];
    if (line.trim() === '') { if (current) current.text.push(line); continue; }
    const ind = indentOf(line);
    if (skipUntilIndentLE !== null) {
      if (ind > skipUntilIndentLE) continue;
      skipUntilIndentLE = null;
    }
    if (skipDefs && ind === baseIndent && /^(def|class)\s/.test(line.trim())) {
      skipUntilIndentLE = baseIndent;
      continue;
    }
    if (ind <= baseIndent) {
      if (current) chunks.push(current);
      current = { startIdx: i, endIdx: i, text: [line] };
    } else if (current) {
      current.text.push(line);
      current.endIdx = i;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function classifyEntry(harnessText, lang) {
  const printRe = PRINT_PATTERNS[lang];
  if (!printRe) return { verdict: 'ambiguous', reason: `no print pattern defined for ${lang}` };

  if (lang === 'python' || lang === 'python27') {
    const span = findPythonEntrySpan(harnessText);
    const chunks = chunkByIndent(span.lines, span.bodyStart, span.bodyEnd, span.baseIndent, span.skipDefs);
    const candidate = chunks.find((c) => c.text.some((l) => printRe.test(l)));
    if (!candidate) return { verdict: 'ambiguous', reason: 'no print call found in entry span' };
    const insertIndent = ' '.repeat(indentOf(candidate.text[0]));
    const markerLine = `${insertIndent}print("${MARKER}")`;
    return { verdict: 'confident', lines: span.lines, insertBeforeIdx: candidate.startIdx, markerLine };
  }

  const entryPattern = ENTRY_PATTERNS[lang];
  if (!entryPattern) return { verdict: 'ambiguous', reason: `no entry pattern defined for ${lang}` };
  const candidateRes = entryPattern.res ?? [entryPattern.re];
  const markerStmt = {
    go: `fmt.Println("${MARKER}")`,
    java: `System.out.println("${MARKER}");`,
    csharp: `Console.WriteLine("${MARKER}");`,
    cpp: `std::cout << "${MARKER}" << std::endl;`,
    cpp14: `std::cout << "${MARKER}" << std::endl;`,
    cpp83: `std::cout << "${MARKER}" << std::endl;`,
    c: `printf("${MARKER}\\n");`,
    c_gcc7: `printf("${MARKER}\\n");`,
    c_gcc8: `printf("${MARKER}\\n");`,
    rust: `println!("${MARKER}");`,
    kotlin: `println("${MARKER}")`,
    javascript: `console.log("${MARKER}");`,
    typescript: `console.log("${MARKER}");`,
  }[lang];

  let span = null;
  for (const re of candidateRes) {
    span = findBraceEntrySpan(harnessText, re);
    if (span) break;
  }
  if (span) {
    const chunks = chunkByBraceDepth(span.lines, span.bodyStart, span.bodyEnd);
    const candidate = chunks.find((c) => c.text.some((l) => printRe.test(l)));
    if (candidate) {
      const insertIndent = ' '.repeat(indentOf(candidate.text[0]));
      const markerLine = `${insertIndent}${markerStmt}`;
      return { verdict: 'confident', lines: span.lines, insertBeforeIdx: candidate.startIdx, markerLine };
    }
  }

  // Fall back to the single-line-body shape (whole callback body on one
  // line, e.g. `(line) => { console.log(...); rl.close(); }`) -- multi-line
  // chunking doesn't apply; splice the marker in right after the opening
  // brace instead, as the body's first statement.
  for (const re of candidateRes) {
    const single = findSingleLineBraceBody(harnessText, re);
    if (single && printRe.test(single.bodyText)) {
      return { verdict: 'confident', lines: single.lines, spliceLineIdx: single.lineIdx, spliceCharIdx: single.insertCharIdx, spliceText: ` ${markerStmt}` };
    }
  }

  // Fall back further to an expression-bodied `.on('close', () => expr)`
  // with no braces at all -- wrap it into a block: `() => { MARKER; expr }`.
  if (lang === 'javascript' || lang === 'typescript') {
    const exprMatch = findExpressionBodyCloseHandler(harnessText, printRe);
    if (exprMatch) {
      return {
        verdict: 'confident',
        lines: exprMatch.lines,
        wrapLineIdx: exprMatch.lineIdx,
        wrapStart: exprMatch.exprStart,
        wrapEnd: exprMatch.exprEnd,
        wrapPrefix: `{ ${markerStmt} `,
        wrapSuffix: ` }`,
      };
    }
  }

  if (!span) return { verdict: 'ambiguous', reason: 'entry function/span not found' };
  return { verdict: 'ambiguous', reason: 'no print call found within entry span' };
}

function applyInsertion(result) {
  const { lines } = result;
  const out = [...lines];
  if (result.wrapLineIdx !== undefined) {
    const line = out[result.wrapLineIdx];
    const exprText = line.slice(result.wrapStart, result.wrapEnd);
    out[result.wrapLineIdx] = line.slice(0, result.wrapStart) + result.wrapPrefix + exprText + result.wrapSuffix + line.slice(result.wrapEnd);
    return out.join('\n');
  }
  if (result.spliceLineIdx !== undefined) {
    const line = out[result.spliceLineIdx];
    out[result.spliceLineIdx] = line.slice(0, result.spliceCharIdx) + result.spliceText + line.slice(result.spliceCharIdx);
    return out.join('\n');
  }
  out.splice(result.insertBeforeIdx, 0, result.markerLine);
  return out.join('\n');
}

// ===== Main =====
if (!langArg) {
  console.error('Usage: node scripts/insert-sentinel-marker.mjs --lang <go|java|python|...> [--dry-run|--apply]');
  process.exit(1);
}

const files = walkFiles(ROOT);
const confident = [];
const ambiguous = [];
let alreadyMarkedCount = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const entry = findHarnessEntry(src, langArg);
  if (!entry) continue;
  if (entry.alreadyMarked) { alreadyMarkedCount++; continue; } // idempotent: skip, don't re-insert
  const result = classifyEntry(entry.text, langArg);
  const rel = path.relative(ROOT, file);
  if (result.verdict === 'confident') {
    confident.push({ file, rel, entry, result });
  } else {
    ambiguous.push({ file, rel, entry, reason: result.reason });
  }
}

console.log(`===== Language: ${langArg} =====`);
console.log(`Total entries: ${confident.length + ambiguous.length + alreadyMarkedCount}`);
console.log(`Already marked (skipped, idempotent): ${alreadyMarkedCount}`);
console.log(`Confident: ${confident.length}`);
console.log(`Ambiguous: ${ambiguous.length}`);
console.log('');

console.log('--- Ambiguous (all, needs manual review) ---');
for (const a of ambiguous) {
  console.log(`  ${a.rel}: ${a.reason}`);
}
console.log('');

const sampleSet = onlyFile ? confident.filter((c) => c.rel.includes(onlyFile)) : confident.slice(0, 5);
console.log(`--- Confident samples (${onlyFile ? `matching "${onlyFile}"` : 'first 5'}) ---`);
for (const c of sampleSet) {
  console.log(`\n### ${c.rel}`);
  if (c.result.wrapLineIdx !== undefined) {
    const beforeLines = c.entry.text.split('\n');
    const anchor = c.result.wrapLineIdx;
    const contextStart = Math.max(0, anchor - 2);
    const contextEnd = Math.min(beforeLines.length, anchor + 3);
    console.log('  expression-bodied close handler -- wrapping into a block:');
    for (let i = contextStart; i < contextEnd; i++) console.log(`    ${i === anchor ? '>>>' : '   '} ${beforeLines[i]}`);
    console.log('  after:');
    console.log(`    +++ ${applyInsertion(c.result).split('\n')[anchor]}`);
    continue;
  }
  if (c.result.spliceLineIdx !== undefined) {
    const beforeLines = c.entry.text.split('\n');
    const anchor = c.result.spliceLineIdx;
    const contextStart = Math.max(0, anchor - 2);
    const contextEnd = Math.min(beforeLines.length, anchor + 3);
    console.log('  single-line body -- splicing marker into the line itself:');
    for (let i = contextStart; i < contextEnd; i++) console.log(`    ${i === anchor ? '>>>' : '   '} ${beforeLines[i]}`);
    console.log('  spliced text:');
    console.log(`    +++ ${JSON.stringify(c.result.spliceText)} inserted at char ${c.result.spliceCharIdx}`);
    continue;
  }
  const before = c.entry.text;
  const beforeLines = before.split('\n');
  const anchor = c.result.insertBeforeIdx;
  const contextStart = Math.max(0, anchor - 2);
  const contextEnd = Math.min(beforeLines.length, anchor + 3);
  console.log('  context before insertion point:');
  for (let i = contextStart; i < contextEnd; i++) console.log(`    ${i === anchor ? '>>>' : '   '} ${beforeLines[i]}`);
  console.log('  inserted line:');
  console.log(`    +++ ${c.result.markerLine}`);
}

if (!dryRun) {
  console.log('\n--- APPLYING (confident entries only) ---');
  for (const c of confident) {
    const src = readFileSync(c.file, 'utf8');
    const after = applyInsertion(c.result);
    const newSrc = src.slice(0, c.entry.start) + after + src.slice(c.entry.end);
    writeFileSync(c.file, newSrc, 'utf8');
    console.log(`  applied: ${c.rel}`);
  }
} else {
  console.log('\n(dry run -- nothing written. Re-run with --apply to write confident entries.)');
}
