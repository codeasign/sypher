// RULE (established 2026-08, after a sitewide C-harness bug went undetected
// for most of a session): every harness/solution string used for submission
// MUST be read from the real .mdx files via parseExerciseFile/
// parseSolutionsFile (which round-trip through @babel/parser, exactly like
// production's own JSX/MDX compiler does) -- never hand-typed into a script.
// A hand-typed reproduction of "what the harness is assumed to contain" can
// silently diverge from the actual file (e.g. a correctly-escaped `\\n` typed
// by habit, vs. the file's actual un-escaped `\n`) and validate a string that
// was never actually shipped. This is why this module exists at all instead
// of ad hoc `_tmp-verify-*.mjs` scripts with copy-pasted source.
import { readFileSync } from 'node:fs';
import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';

// --- Direct RapidAPI calls, bypassing apps/app's own proxy entirely ---
// Chosen deliberately for this audit: the proxy's judge0:submit:{userId}
// rate limit (3/10min) is sized for real interactive use, not a
// multi-thousand-submission sweep, and routing around it with many
// disposable Supabase users would hammer Supabase Auth's admin API under
// concurrency (confirmed empirically -- that's what broke Batch 1's first
// run). RapidAPI itself has no such per-caller limit for this key. No proxy
// or Supabase code is touched by any of this.
const envSrc = readFileSync('D:/jenny/sypher/apps/app/.env.local', 'utf8');
const env = (key) => envSrc.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();
const RAPIDAPI_KEY = env('JUDGE0_RAPIDAPI_KEY');
const RAPIDAPI_HOST = envSrc.match(/^JUDGE0_RAPIDAPI_HOST=(.+)$/m)?.[1]?.trim() ?? 'judge0-ce.p.rapidapi.com';
const RAPIDAPI_BASE_URL = 'https://judge0-ce.p.rapidapi.com';
const SENTINEL_MARKER = '###SYPHER_JUDGE0_RESULT###';
const RAPIDAPI_BATCH_CHUNK_SIZE = 20;

function headers(extra) {
  return { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST, ...extra };
}
function b64encode(s) { return Buffer.from(s, 'utf8').toString('base64'); }
function b64decode(s) { return s == null ? null : Buffer.from(s, 'base64').toString('utf8'); }
function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
// Same marker-stripping semantics as judge0Client.ts's extractGradedOutput --
// grading compares only what's printed AFTER the LAST marker occurrence.
function extractGradedOutput(stdout) {
  if (stdout == null) return null;
  const idx = stdout.lastIndexOf(SENTINEL_MARKER);
  if (idx === -1) return stdout;
  return stdout.slice(idx + SENTINEL_MARKER.length).replace(/^\r?\n/, '');
}

const TYPESCRIPT_LANGUAGE_ID = 74;
const TYPESCRIPT_COMPILER_OPTIONS = '--lib es2015,dom --target es2015';

async function submitBatchRapid(submissions) {
  const results = [];
  for (const group of chunk(submissions, RAPIDAPI_BATCH_CHUNK_SIZE)) {
    const res = await fetch(`${RAPIDAPI_BASE_URL}/submissions/batch?base64_encoded=true`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        submissions: group.map((s) => ({
          source_code: b64encode(s.source_code),
          language_id: s.language_id,
          stdin: b64encode(s.stdin),
          cpu_time_limit: s.cpu_time_limit,
          memory_limit: s.memory_limit,
          ...(s.language_id === TYPESCRIPT_LANGUAGE_ID ? { compiler_options: TYPESCRIPT_COMPILER_OPTIONS } : {}),
        })),
      }),
    });
    if (!res.ok) throw new Error(`RapidAPI submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    results.push(...data);
  }
  return results;
}

async function pollBatchRapid(tokens) {
  const results = [];
  for (const group of chunk(tokens, RAPIDAPI_BATCH_CHUNK_SIZE)) {
    const res = await fetch(
      `${RAPIDAPI_BASE_URL}/submissions/batch?tokens=${group.join(',')}&base64_encoded=true&fields=token,status,stdout,stderr,compile_output,time,memory`,
      { headers: headers() },
    );
    if (!res.ok) throw new Error(`RapidAPI poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    results.push(...data.submissions.map((r) => ({
      ...r, stdout: b64decode(r.stdout), stderr: b64decode(r.stderr), compile_output: b64decode(r.compile_output),
    })));
  }
  return results;
}

function isDone(result) { return (result?.status?.id ?? 0) > 2; }

async function runBatchToCompletion(submissions, { maxAttempts = 30, intervalMs = 1000 } = {}) {
  const tokens = (await submitBatchRapid(submissions)).map((s) => s.token);
  const byToken = new Map();
  for (let attempt = 0; attempt < maxAttempts && byToken.size < tokens.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, intervalMs));
    const pending = tokens.filter((t) => !byToken.has(t));
    const results = await pollBatchRapid(pending);
    for (const result of results) if (isDone(result)) byToken.set(result.token, result);
  }
  return tokens.map((token) => byToken.get(token) ?? { token, status: { id: -1, description: 'Execution timed out' }, stdout: null, stderr: null, compile_output: null, time: null, memory: null });
}

// --- composeSourceCode, kept in sync with production apps/docs/src/components/CoreEditor/Index.tsx ---
function extractPreamble(source) {
  const lines = source.split('\n');
  let i = 0;
  if (/^package\s+\w+\s*$/.test(lines[0] ?? '')) {
    const preambleLines = [lines[0]];
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (/^import\s*\(/.test(lines[i] ?? '')) {
      while (i < lines.length) {
        preambleLines.push(lines[i]);
        const isEnd = lines[i].trim().endsWith(')'); // handles single-line `import ("fmt")` too, not just multi-line blocks
        i++;
        if (isEnd) break;
      }
    } else if (/^import\s+"/.test(lines[i] ?? '')) {
      preambleLines.push(lines[i]);
      i++;
    }
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }
  if (/^import\s*\(/.test(lines[0] ?? '')) {
    const preambleLines = [];
    i = 0;
    while (i < lines.length) {
      preambleLines.push(lines[i]);
      const isEnd = lines[i].trim() === ')';
      i++;
      if (isEnd) break;
    }
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }
  const isDirective = (line) => /^\s*(import\s|using\s|#include\b)/.test(line);
  const preambleLines = [];
  while (i < lines.length && (isDirective(lines[i]) || lines[i].trim() === '')) {
    if (isDirective(lines[i])) preambleLines.push(lines[i]);
    i++;
  }
  return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
}
function parseGoPreamble(preamble) {
  const lines = preamble.split('\n');
  const packageLine = lines.find((line) => /^package\s+\w+/.test(line)) ?? '';
  const imports = [];
  for (const line of lines) {
    const single = line.match(/^import\s+"([^"]+)"/);
    if (single) { imports.push(single[1]); continue; }
    const grouped = line.match(/^import\s*\(([^)]*)\)/);
    if (grouped) {
      const quoted = grouped[1].match(/"([^"]+)"/g) ?? [];
      for (const q of quoted) imports.push(q.slice(1, -1));
      continue;
    }
    const blockEntry = line.match(/^\s*"([^"]+)"\s*$/);
    if (blockEntry) imports.push(blockEntry[1]);
  }
  return { packageLine, imports };
}
function composeGoPreamble(hPreamble, cPreamble) {
  const h = parseGoPreamble(hPreamble);
  const c = parseGoPreamble(cPreamble);
  const packageLine = h.packageLine || c.packageLine;
  const imports = Array.from(new Set([...h.imports, ...c.imports]));
  const importBlock = imports.length === 0 ? '' : imports.length === 1 ? `import "${imports[0]}"` : `import (\n${imports.map((p) => `    "${p}"`).join('\n')}\n)`;
  return [packageLine, importBlock].filter((p) => p !== '').join('\n');
}
function extractLeadingDataStruct(harnessBody, studentBody) {
  const lines = harnessBody.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const typedefMatch = /^typedef\s+struct\s*\{?\s*$/.test(lines[i] ?? '') || /^typedef\s+struct\s*\{/.test(lines[i] ?? '');
  const namedMatch = /^struct\s+(\w+)\s*\{/.test(lines[i] ?? '');
  if (!typedefMatch && !namedMatch) return null;
  const startLine = i;
  let depth = 0;
  let sawOpenBrace = false;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; sawOpenBrace = true; }
      else if (ch === '}') depth--;
    }
    if (sawOpenBrace && depth === 0) break;
  }
  if (!sawOpenBrace || depth !== 0) return null;
  let endLine = i;
  if (typedefMatch && !/\}\s*\w+\s*;\s*$/.test(lines[endLine])) {
    if (endLine + 1 < lines.length && /^\s*\w+\s*;\s*$/.test(lines[endLine + 1])) endLine++;
  }
  const fullStructText = lines.slice(startLine, endLine + 1).join('\n');
  if (/\b(public|private|protected)\s*:/.test(fullStructText)) return null;
  const nameMatch = fullStructText.match(/^struct\s+(\w+)/) ?? fullStructText.match(/\}\s*(\w+)\s*;\s*$/);
  const typeName = nameMatch?.[1];
  if (typeName && new RegExp(`\\b(class|struct)\\s+${typeName}\\s*\\{`).test(studentBody)) return null;
  const rest = lines.slice(endLine + 1).join('\n');
  return { preamble: fullStructText, body: rest };
}
function composeSourceCode(harness, code, language) {
  const h = extractPreamble(harness);
  const c = extractPreamble(code);
  const isGo = /^package\s+\w+/.test(h.preamble) || /^package\s+\w+/.test(c.preamble);
  const preamble = isGo ? composeGoPreamble(h.preamble, c.preamble) : [h.preamble, c.preamble].filter((p) => p.trim() !== '').join('\n\n');
  const hoisted = extractLeadingDataStruct(h.body, c.body);
  const dataStructPreamble = hoisted?.preamble ?? '';
  const harnessBody = hoisted?.body ?? h.body;
  const composed = [preamble, dataStructPreamble, c.body, harnessBody].filter((p) => p.trim() !== '').join('\n\n');
  if (language === 'python') return `from __future__ import annotations\n${composed}`;
  return composed;
}

const LANGUAGE_IDS = {
  python: 71, java: 62, cpp: 54, javascript: 63, typescript: 74,
  rust: 73, c: 50, csharp: 51, go: 95, kotlin: 78, python27: 70,
};

// Submits all testCases for one (harness, solution) pair, grades each via
// marker-stripped comparison (matching the real proxy's grading semantics,
// NOT Judge0's own expected_output comparison, which knows nothing about
// the marker convention). statusId 3/4/6 are synthesized to mean the same
// thing CoreEditor's STATUS_MAP expects (accepted/wrong_answer/compile_error);
// other Judge0 statuses (TLE, RE, etc.) pass through as-is.
async function submitOne({ languageId, harness, solution, testCases, cpuTimeLimit, memoryLimit, language }) {
  const sourceCode = composeSourceCode(harness, solution, language);
  const submissions = testCases.map((tc) => ({
    source_code: sourceCode, language_id: languageId, stdin: tc.stdin,
    cpu_time_limit: cpuTimeLimit, memory_limit: memoryLimit,
  }));
  const raw = await runBatchToCompletion(submissions);
  const results = raw.map((r, i) => {
    if (r.status?.id === 6) return { index: i, statusId: 6, statusDescription: 'Compilation Error', stdout: r.stdout, stderr: r.stderr, compileOutput: r.compile_output, time: r.time, memory: r.memory };
    if (r.status?.id > 3 && r.status?.id !== 4) return { index: i, statusId: r.status.id, statusDescription: r.status.description, stdout: r.stdout, stderr: r.stderr, compileOutput: r.compile_output, time: r.time, memory: r.memory };
    const graded = extractGradedOutput(r.stdout);
    const passed = graded === testCases[i].expectedOutput;
    return { index: i, statusId: passed ? 3 : 4, statusDescription: passed ? 'Accepted' : 'Wrong Answer', stdout: r.stdout, stderr: r.stderr, compileOutput: null, time: r.time, memory: r.memory };
  });
  const passed = results.filter((r) => r.statusId === 3).length;
  return { httpStatus: 200, passed, total: results.length, results, sourceCode };
}

// Solutions pages are written for human reading, not standalone compilation
// -- they routinely omit "obvious" imports (java.util.HashMap, C++'s
// <vector>/<string>/<iostream>, C#'s System namespaces, Rust's
// std::io::Read) that a reader is assumed to already have from context.
// That's not a bug in what real students experience (they use the actual
// harness + their own code, never raw solutions-page text), just a gap in
// using these snippets as this audit's "known-correct" reference. Prepend
// a small, safe, catch-all preamble ONLY when testing extracted
// solutions-page code -- NEVER for starterCode/harness composition, which
// must stay exactly what real students see.
function supplementSolutionPreamble(language, code, harness = '') {
  if (language === 'rust') {
    // Rust hard-errors on a duplicate `use` of the same item (unlike
    // Java/C#'s harmless-duplicate-import tolerance), so unlike the other
    // languages here this can't be a blind prepend -- only add each piece
    // if neither the solution snippet NOR the harness (which composeSourceCode
    // will merge in regardless) already references that std path. A harness
    // that already does its own `use std::io::{self, Read};` for example
    // would otherwise collide with a blindly-prepended `use std::io::Read;`.
    const combined = code + '\n' + harness;
    let out = code;
    if (!combined.includes('std::io::Read') && !combined.includes('use std::io::{')) out = 'use std::io::Read;\n' + out;
    if (!combined.includes('std::collections::')) out = 'use std::collections::{HashMap, HashSet, VecDeque, BTreeMap, BTreeSet, BinaryHeap};\n' + out;
    return out;
  }
  const prefix = {
    cpp: '#include <bits/stdc++.h>\nusing namespace std;\n',
    csharp: 'using System;\nusing System.Collections.Generic;\nusing System.Linq;\n',
    java: 'import java.util.*;\n',
    c: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <limits.h>\n',
  }[language];
  return prefix ? prefix + code : code;
}

// Solutions pages routinely show just the function/method body and omit the
// leading struct/class node definition (ListNode, TreeNode, etc.) that real
// students get for free at the top of starterCode and simply never delete.
// Detects that leading type definition in starterCode and, if the extracted
// solution snippet doesn't already redefine the same name, prepends it --
// audit-only, mirrors what a real student's submission always retains.
function extractLeadingTypeDef(text, language) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  // Python: `class Name:` / `class Name(object):`, body = indented block.
  // Skip any leading import lines first (e.g. `from typing import ...`) --
  // the solution snippet typically already carries its own imports, only
  // the class definition itself needs hoisting.
  if (language === 'python' || language === 'python27') {
    while (i < lines.length && (lines[i].trim() === '' || /^(import\s|from\s.+\simport\s)/.test(lines[i]))) i++;
    const m = /^class\s+(\w+)\s*(?:\([^)]*\))?\s*:\s*$/.exec(lines[i] ?? '');
    if (!m) return null;
    const startLine = i;
    i++;
    while (i < lines.length && (lines[i].trim() === '' || /^[ \t]/.test(lines[i]))) i++;
    let endLine = i - 1;
    while (endLine > startLine && lines[endLine].trim() === '') endLine--;
    return { name: m[1], text: lines.slice(startLine, endLine + 1).join('\n') };
  }
  // JS/TS constructor-function idiom: `function Name(val, next) { ... }`.
  if (language === 'javascript' || language === 'typescript') {
    const fm = /^function\s+(\w+)\s*\([^)]*\)\s*\{/.exec(lines[i] ?? '');
    if (fm) {
      const startLine = i;
      let depth = 0, sawOpenBrace = false;
      for (; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if (ch === '{') { depth++; sawOpenBrace = true; }
          else if (ch === '}') depth--;
        }
        if (sawOpenBrace && depth === 0) break;
      }
      if (!sawOpenBrace || depth !== 0) return null;
      return { name: fm[1], text: lines.slice(startLine, i + 1).join('\n') };
    }
  }
  // Go: `type Name struct { ... }`, not `struct Name { ... }`.
  if (language === 'go') {
    while (i < lines.length && (lines[i].trim() === '' || /^(package\s|import\s)/.test(lines[i]))) i++;
    const gm = /^type\s+(\w+)\s+struct\s*\{/.exec(lines[i] ?? '');
    if (!gm) return null;
    const startLine = i;
    let depth = 0, sawOpenBrace = false;
    for (; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; sawOpenBrace = true; }
        else if (ch === '}') depth--;
      }
      if (sawOpenBrace && depth === 0) break;
    }
    if (!sawOpenBrace || depth !== 0) return null;
    return { name: gm[1], text: lines.slice(startLine, i + 1).join('\n') };
  }
  // Skip any leading #include/using/import lines (C/C++/Java/C# preambles),
  // or a Rust attribute like `#[derive(Debug)]`, before searching for the
  // struct/class -- starterCode sometimes carries these ahead of the
  // data-type definition.
  while (i < lines.length && (lines[i].trim() === '' || /^(#include\b|using\s|import\s|#\[)/.test(lines[i]))) i++;
  const structMatch = /^(?:public\s+)?struct\s+(\w+)\s*\{/.test(lines[i] ?? '');
  const classMatch = /^(?:public\s+)?class\s+(\w+)\s*\{/.test(lines[i] ?? '');
  const typedefMatch = /^typedef\s+struct\s*\{?\s*$/.test(lines[i] ?? '') || /^typedef\s+struct\s*\{/.test(lines[i] ?? '');
  // `typedef struct NAME { ... } NAME;` -- named (not anonymous) struct with
  // a typedef, common C idiom so callers can write `NAME` instead of
  // `struct NAME` everywhere.
  const namedTypedefMatch = /^typedef\s+struct\s+\w+\s*\{/.test(lines[i] ?? '');
  if (!structMatch && !classMatch && !typedefMatch && !namedTypedefMatch) return null;
  const startLine = i;
  let depth = 0;
  let sawOpenBrace = false;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; sawOpenBrace = true; }
      else if (ch === '}') depth--;
    }
    if (sawOpenBrace && depth === 0) break;
  }
  if (!sawOpenBrace || depth !== 0) return null;
  let endLine = i;
  if (typedefMatch && !/\}\s*\w+\s*;\s*$/.test(lines[endLine])) {
    if (endLine + 1 < lines.length && /^\s*\w+\s*;\s*$/.test(lines[endLine + 1])) endLine++;
  }
  // Rust: a struct is sometimes followed by an `impl ... for Name { ... }`
  // block (e.g. a cycle-safe custom Drop) that must be hoisted alongside it
  // as one unit -- greedily consume any immediately-following impl blocks.
  if (language === 'rust' && structMatch) {
    let j = endLine + 1;
    for (;;) {
      while (j < lines.length && lines[j].trim() === '') j++;
      if (!/^impl\b/.test(lines[j] ?? '')) break;
      let d = 0, saw = false;
      const implStart = j;
      for (; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') { d++; saw = true; }
          else if (ch === '}') d--;
        }
        if (saw && d === 0) break;
      }
      if (!saw || d !== 0) { j = implStart; break; }
      endLine = j;
      j++;
    }
  }
  const fullText = lines.slice(startLine, endLine + 1).join('\n');
  const nameMatch = fullText.match(/^(?:public\s+)?(?:struct|class)\s+(\w+)/) ?? fullText.match(/\}\s*(\w+)\s*;\s*$/);
  return { name: nameMatch?.[1], text: fullText };
}
function ensureLeadingDataStruct(starterCode, solutionCode, language) {
  if (!starterCode) return solutionCode;
  const def = extractLeadingTypeDef(starterCode, language);
  if (!def || !def.name) return solutionCode;
  // Must require a defining form (brace/colon/paren), not a mere type
  // reference like `struct ListNode* head` (a parameter, not a definition).
  const alreadyDefined =
    (language === 'python' || language === 'python27')
      ? new RegExp(`^class\\s+${def.name}\\b`, 'm').test(solutionCode)
      : (language === 'javascript' || language === 'typescript')
      ? new RegExp(`\\bfunction\\s+${def.name}\\s*\\(|\\bclass\\s+${def.name}\\s*\\{`).test(solutionCode)
      : language === 'go'
      ? new RegExp(`\\btype\\s+${def.name}\\s+struct\\s*\\{`).test(solutionCode)
      // C's anonymous-struct-with-trailing-typedef-name idiom
      // (`typedef struct { ... } NumArray;`) has the name AFTER the closing
      // brace, not in a `struct NAME {` form -- check for that too.
      : new RegExp(`\\b(class|struct)\\s+${def.name}\\s*\\{|\\}\\s*${def.name}\\s*;`).test(solutionCode);
  if (alreadyDefined) return solutionCode;
  return `${def.text}\n\n${solutionCode}`;
}

export { parseExerciseFile, parseSolutionsFile, composeSourceCode, LANGUAGE_IDS, submitOne, supplementSolutionPreamble, ensureLeadingDataStruct };

// CLI: node _audit-run.mjs <category> <problem-slug> <difficulty> [lang]
// e.g. node _audit-run.mjs arrays two-sum easy python
// (process.argv is process-global, so guard on the entry script's own basename
// -- otherwise this block also fires when another script imports this module.)
const isMainModule = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('_audit-run.mjs');
if (isMainModule && process.argv[2]) {
  const [, , category, slug, difficulty, onlyLang] = process.argv;
  const exercisePath = `../docs/docs/coding-bootcamp/${category}/exercises/${difficulty}/${slug}.mdx`;
  const solutionsPath = `../docs/docs/coding-bootcamp/${category}/solutions/${difficulty}/${slug}.mdx`;
  const ex = parseExerciseFile(exercisePath);
  const sol = parseSolutionsFile(solutionsPath);
  const langs = onlyLang ? [onlyLang] : Object.keys(ex.harness).filter((l) => LANGUAGE_IDS[l] && sol[l]);
  const meta = { cpuTimeLimit: 2, memoryLimit: 262144 };
  for (const lang of langs) {
    if (!sol[lang]) { console.log(`[SKIP] ${slug}/${lang} -- no solution code`); continue; }
    const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], sol[lang], lang);
    const correct = await submitOne({
      languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
      testCases: ex.testCases, cpuTimeLimit: meta.cpuTimeLimit, memoryLimit: meta.memoryLimit, language: lang,
    });
    const ok = correct.httpStatus === 200 && correct.passed === correct.total && correct.total === ex.testCases.length;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${slug}/${lang}/correct -- HTTP ${correct.httpStatus}, ${correct.passed}/${correct.total}`);
    if (!ok) {
      console.log('  composed source:\n' + correct.sourceCode.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('  results:', JSON.stringify(correct.results, null, 2));
    }
    const wrong = await submitOne({
      languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: ex.starterCode[lang],
      testCases: ex.testCases, cpuTimeLimit: meta.cpuTimeLimit, memoryLimit: meta.memoryLimit, language: lang,
    });
    const wrongOk = wrong.httpStatus === 200 && wrong.passed < wrong.total;
    console.log(`[${wrongOk ? 'PASS' : 'FAIL'}] ${slug}/${lang}/wrong -- HTTP ${wrong.httpStatus}, ${wrong.passed}/${wrong.total}`);
  }
}
