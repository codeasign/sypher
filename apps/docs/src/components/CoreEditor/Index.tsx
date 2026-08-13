import React, { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useColorMode } from '@docusaurus/theme-common';
import { trackEvent } from '@site/src/lib/analytics';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppOrigin } from '@sypher/auth-core/src/urls';
import type { SupabaseClient } from '@supabase/supabase-js';

interface TestCase {
  stdin: string;
  expectedOutput: string;
  isSample?: boolean;
}

interface ProblemMeta {
  id: string;
  timeLimitSeconds: number;
  memoryLimitKb: number;
}

interface TestResult {
  index: number;
  status: 'accepted' | 'wrong_answer' | 'tle' | 'error' | 'pending';
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

interface CodeEditorProps {
  meta: ProblemMeta;
  testCases: TestCase[];
  starterCode: Record<string, string>;
  harness?: Record<string, string>;
  defaultLanguage?: string;
}

// Verified against RapidAPI's hosted Judge0 CE GET /languages (2026-08-06) --
// every id below is confirmed to exist there. Six legacy keys that exercise
// .mdx files still author (csharp_mono52, csharp_mono54, java8, python35,
// python36, rust120) map to ids that don't exist on RapidAPI's instance
// (they were only valid against the old self-hosted Docker image) and are
// deliberately omitted here rather than left pointing at a dead id --
// selecting one of those still-authored keys now fails cleanly with
// "Missing languageId" (400) instead of a confusing upstream 502.
// python311/c_gcc13/cpp_clang17/java21/csharp_dotnet8/javascript_node20/
// typescript516/rust179/go122 were also removed: no exercise anywhere in the
// codebase uses ProblemEditor/CodeEditor with those keys (search-algorithms/
// sorting-algorithms, the courses they were provisioned for, don't use this
// component), so they were dead entries.
const LANGUAGE_IDS: Record<string, number> = {
  python: 71, python27: 70,
  javascript: 63, java: 62,
  cpp: 54, cpp14: 52, cpp83: 53,
  c: 50, c_gcc8: 49, c_gcc7: 48,
  csharp: 51,
  go: 60, rust: 73, typescript: 74,
  kotlin: 78,
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python 3.8', python27: 'Python 2.7',
  javascript: 'JavaScript (ECMA)',
  java: 'Java (OpenJDK 13)',
  cpp: 'C++ 17 (GCC 9.2)', cpp14: 'C++ 14 (GCC 7.4)', cpp83: 'C++ (GCC 8.3)',
  c: 'C (GCC 9.2)', c_gcc8: 'C (GCC 8.3)', c_gcc7: 'C (GCC 7.4)',
  csharp: 'C# (Mono 6.6)',
  go: 'Go 1.13', rust: 'Rust 1.40',
  typescript: 'TypeScript 3.7',
  kotlin: 'Kotlin 1.3',
};

const MONACO_LANGUAGES: Record<string, string> = {
  python27: 'python',
  cpp14: 'cpp', cpp83: 'cpp',
  c: 'c', c_gcc8: 'c', c_gcc7: 'c',
  csharp: 'csharp',
};

const BASE_LANGUAGE: Record<string, string> = {
  python27: 'python27', cpp14: 'cpp', cpp83: 'cpp',
  c_gcc8: 'c', c_gcc7: 'c',
};

// -1 is not a real Judge0 status id -- it's synthesized server-side by
// judge0Client.ts's timedOut() for submissions that never finish polling
// within the allotted attempts (see runBatchToCompletion). Mapped to the
// same 'tle' bucket as Judge0's own native TLE (id 5) so both render with
// the same yellow badge instead of this case falling through to the red
// 'error' badge.
const STATUS_MAP: Record<number, TestResult['status']> = {
  3: 'accepted', 4: 'wrong_answer', 5: 'tle', [-1]: 'tle',
};

// Judge0 credentials never reach the browser -- CoreEditor calls apps/app's
// /api/judge0/* proxy instead of Judge0/RapidAPI directly, authenticated
// with this Supabase access token rather than a Judge0 auth header.
async function getAuthToken(supabase: SupabaseClient | null): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface ProxyResult {
  index: number;
  statusId: number | undefined;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

interface ProxyCustomResult {
  statusId: number | undefined;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

interface ProxyErrorBody {
  error: string;
  code?: string;
  resetsAt?: string;
}

async function proxyErrorBody(res: Response): Promise<ProxyErrorBody> {
  const body = await res.json().catch(() => null) as ProxyErrorBody | null;
  return body ?? { error: `Request failed: ${res.status}` };
}

// The monthly-limit rejection carries a machine-readable code + resetsAt so
// this can show a friendly message with the server's own reset date, rather
// than the raw error string used for every other failure (compile errors,
// the 10-min rate limit, etc).
function friendlyErrorMessage(body: ProxyErrorBody): string {
  if (body.code === 'monthly_limit_reached' && body.resetsAt) {
    const resetDate = new Date(body.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `Monthly limit reached, resets on ${resetDate}.`;
  }
  return body.error;
}

interface MonthlyUsage {
  isPaid: boolean;
  limit: number | null;
  remaining: number | null;
  resetsAt: string | null;
}

interface SplitSource {
  preamble: string;
  body: string;
}

function consumeGoImportBlock(lines: string[], startIdx: number, preambleLines: string[]): number {
  let i = startIdx;
  while (i < lines.length) {
    preambleLines.push(lines[i]);
    // endsWith, not `=== ')'` -- a single-line grouped import like
    // `import ("fmt")` has its closing paren on the SAME line as the
    // opening one, so it would never match a lone-`)`-line check and this
    // loop would run away, swallowing the rest of the source (including
    // the harness's own main()) into the "preamble". endsWith still
    // correctly matches the standard multi-line `import (\n "fmt"\n)`
    // style too, since its closing line is just `)`, which also ends with
    // `)`. Confirmed empirically via a real audit run, 2026-08.
    const isEnd = lines[i].trim().endsWith(')');
    i++;
    if (isEnd) break;
  }
  return i;
}

// Pulls out whatever must stay at the literal top of the file: Go's
// `package` line (+ its immediately-following import block/line, which is
// the only truly positional requirement Go has), or generic leading
// import/using/#include lines for every other language. No semicolon
// requirement on the generic branch -- Kotlin's `import` has none.
function extractPreamble(source: string): SplitSource {
  const lines = source.split('\n');
  let i = 0;

  if (/^package\s+\w+\s*$/.test(lines[0] ?? '')) {
    const preambleLines = [lines[0]];
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (/^import\s*\(/.test(lines[i] ?? '')) {
      i = consumeGoImportBlock(lines, i, preambleLines);
    } else if (/^import\s+"/.test(lines[i] ?? '')) {
      preambleLines.push(lines[i]);
      i++;
    }
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }

  // Student Go code has no `package` line of its own (only the harness
  // carries one) but may still open directly with a parenthesized
  // `import (...)` block -- Go-specific syntax no other supported language
  // uses `import (` for, so it's safe to special-case ahead of the generic
  // single-line-per-import branch below.
  if (/^import\s*\(/.test(lines[0] ?? '')) {
    const preambleLines: string[] = [];
    i = consumeGoImportBlock(lines, 0, preambleLines);
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }

  const isDirective = (line: string) => /^\s*(import\s|using\s|#include\b)/.test(line);
  const preambleLines: string[] = [];
  while (i < lines.length && (isDirective(lines[i]) || lines[i].trim() === '')) {
    if (isDirective(lines[i])) preambleLines.push(lines[i]);
    i++;
  }
  return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
}

// Go raises a hard compile error on two separate `import` declarations of
// the same package ("fmt redeclared as imported package name"), unlike
// Java/C#/Kotlin which tolerate duplicate imports harmlessly. Since the
// harness's import block and the student's own imports are hoisted
// independently in composeSourceCode, a student solution that imports a
// package the harness already imports would hit this compile error --
// confirmed empirically during the RapidAPI migration, 2026-08. Parse out
// the package line + import paths so they can be merged with dedup instead
// of concatenated.
function parseGoPreamble(preamble: string): { packageLine: string; imports: string[] } {
  const lines = preamble.split('\n');
  const packageLine = lines.find((line) => /^package\s+\w+/.test(line)) ?? '';
  const imports: string[] = [];
  for (const line of lines) {
    const single = line.match(/^import\s+"([^"]+)"/);
    if (single) { imports.push(single[1]); continue; }
    // Single-line grouped form: `import ("fmt")` (or, in principle,
    // multiple packages on one line) -- distinct from both the bare
    // `import "fmt"` case above and the multi-line block's own per-line
    // `"fmt"` entries below. Missing this meant the import was silently
    // dropped even after consumeGoImportBlock correctly bounded the
    // preamble/body split, since this function never saw it as an import
    // at all. Confirmed empirically via a real audit run, 2026-08.
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

function composeGoPreamble(hPreamble: string, cPreamble: string): string {
  const h = parseGoPreamble(hPreamble);
  const c = parseGoPreamble(cPreamble);
  const packageLine = h.packageLine || c.packageLine;
  const imports = Array.from(new Set([...h.imports, ...c.imports]));
  const importBlock = imports.length === 0
    ? ''
    : imports.length === 1
      ? `import "${imports[0]}"`
      : `import (\n${imports.map((p) => `    "${p}"`).join('\n')}\n)`;
  return [packageLine, importBlock].filter((p) => p !== '').join('\n');
}

// Some harnesses (C/C++ linked-list/tree-node style problems) declare a
// plain data type -- `struct ListNode { ... };` or `typedef struct {...}
// Name;` -- that the STUDENT's own code references (e.g. `hasCycle(ListNode*
// head)`), not one the student redeclares. Since composeSourceCode always
// places the student's body before the harness's body (see below), that
// type would be an incomplete/undeclared type from the student body's point
// of view -- a real compile error in C/C++, confirmed empirically
// (linked-list-cycle.mdx, 2026-08). Only a single leading struct/typedef-
// struct block right at the top of the harness body is hoisted -- never a
// `class`, since a C++ `class` is exactly the shape that would risk
// reintroducing a harness/student duplicate-implementation shadow if hoisted
// blindly, and this repo's harness-shadow fixes deliberately keep the
// harness's own logic after the student's.
function extractLeadingDataStruct(harnessBody: string, studentBody: string): SplitSource | null {
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

  // typedef form ends with `} Name;` on the same closing-brace line (or the next).
  let endLine = i;
  const structText = lines.slice(startLine, endLine + 1).join('\n');
  if (typedefMatch && !/\}\s*\w+\s*;\s*$/.test(lines[endLine])) {
    if (endLine + 1 < lines.length && /^\s*\w+\s*;\s*$/.test(lines[endLine + 1])) endLine++;
  }
  const fullStructText = lines.slice(startLine, endLine + 1).join('\n');

  // Refuse to hoist a struct with access specifiers -- that's a C++ class
  // wearing a struct keyword, exactly the shape the shadow fixes guard against.
  if (/\b(public|private|protected)\s*:/.test(fullStructText)) return null;

  const nameMatch = fullStructText.match(/^struct\s+(\w+)/) ?? fullStructText.match(/\}\s*(\w+)\s*;\s*$/);
  const typeName = nameMatch?.[1];
  // Require a `{` right after the name -- a genuine declaration, not just a
  // reference like `struct ListNode* head` (which also matches `struct\s+Name`
  // but isn't the student declaring the type themselves).
  if (typeName && new RegExp(`\\b(class|struct)\\s+${typeName}\\s*\\{`).test(studentBody)) {
    return null; // student already declares this type themselves -- not ours to hoist.
  }

  const rest = lines.slice(endLine + 1).join('\n');
  return { preamble: fullStructText, body: rest };
}

// Composes the final Judge0 source. Harness must run AFTER the student's
// code -- otherwise the harness's own top-level driver code (which calls
// into the student's function/class) executes before that function/class
// is defined, breaking any language without hoisting (Python: NameError;
// confirmed empirically during the RapidAPI migration, 2026-08). But some
// languages also require specific lines to stay at the literal file start
// (Go's `package`; Java/C#/Kotlin's `import`/`using`; C/C++'s `#include`
// and point-of-declaration `using namespace`) regardless of which side --
// harness or student code -- they originated from. So: extract each side's
// leading preamble first, hoist both to the true top, then place the
// student's body before the harness's body.
function composeSourceCode(harness: string, code: string, language?: string): string {
  const h = extractPreamble(harness);
  const c = extractPreamble(code);
  const isGo = /^package\s+\w+/.test(h.preamble) || /^package\s+\w+/.test(c.preamble);
  const preamble = isGo ? composeGoPreamble(h.preamble, c.preamble) : [h.preamble, c.preamble].filter((p) => p.trim() !== '').join('\n\n');

  const hoisted = extractLeadingDataStruct(h.body, c.body);
  const dataStructPreamble = hoisted?.preamble ?? '';
  const harnessBody = hoisted?.body ?? h.body;

  const composed = [preamble, dataStructPreamble, c.body, harnessBody].filter((p) => p.trim() !== '').join('\n\n');

  // Judge0's `python` id runs 3.8.1, but starterCode across the course uses
  // PEP 585 subscripted generics (`list[int]`, `dict[str, int]`, ...), only
  // valid at runtime from 3.9 -- eagerly evaluating those annotations on 3.8
  // raises `TypeError: 'type' object is not subscriptable` before any
  // student logic runs, confirmed empirically 2026-08. `from __future__
  // import annotations` (PEP 563, supported since 3.7) defers annotation
  // evaluation to strings, sidestepping the crash. Must be the literal first
  // line -- future imports are only legal before every other statement.
  if (language === 'python') {
    return `from __future__ import annotations\n${composed}`;
  }

  return composed;
}

function StatusBadge({ status, description }: { status: TestResult['status']; description: string }) {
  const config: Record<TestResult['status'], { bg: string; color: string; icon: string }> = {
    accepted:     { bg: '#14532D33', color: '#22C55E', icon: '✓' },
    wrong_answer: { bg: '#7F1D1D33', color: '#EF4444', icon: '✗' },
    tle:          { bg: '#78350F33', color: '#EAB308', icon: '⏱' },
    error:        { bg: '#7F1D1D33', color: '#EF4444', icon: '!' },
    pending:      { bg: 'var(--ifm-color-emphasis-200)', color: 'var(--ifm-color-emphasis-600)', icon: '…' },
  };
  const { bg, color, icon } = config[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
      {icon} {description}
    </span>
  );
}

const vars = {
  bg: 'var(--ifm-background-color)',
  surface: 'var(--ifm-background-surface-color)',
  border: 'var(--ifm-color-emphasis-200)',
  borderStrong: 'var(--ifm-color-emphasis-300)',
  text: 'var(--ifm-font-color-base)',
  textMuted: 'var(--ifm-color-emphasis-600)',
  textLabel: 'var(--ifm-color-emphasis-500)',
  textHeading: 'var(--ifm-heading-color)',
  accent: 'var(--ifm-color-primary)',
  codeBg: 'var(--ifm-code-background)',
  red: '#EF4444',
  redBorder: '#7F1D1D',
  green: '#22C55E',
  greenBorder: '#14532D',
  yellow: '#EAB308',
};

const preStyle: React.CSSProperties = {
  margin: 0, padding: '8px 12px', background: vars.bg,
  border: `1px solid ${vars.border}`, borderRadius: 4, color: vars.text,
  fontSize: '0.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

const HELP_DISMISSED_KEY = 'sypher-ide-help-dismissed';

const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: vars.bg, color: vars.text,
  border: `1px solid ${vars.border}`, borderRadius: 4, padding: '8px 10px',
  fontSize: '0.78rem', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  lineHeight: 1.5, resize: 'vertical', minHeight: 48, outline: 'none',
};

export default function CodeEditor({ meta, testCases, starterCode, harness, defaultLanguage = 'python' }: CodeEditorProps): JSX.Element {
  const { supabase, role } = useAuth();

  const { colorMode } = useColorMode();
  const monacoTheme = colorMode === 'dark' ? 'vs-dark' : 'vs-light';

  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(starterCode[defaultLanguage] ?? '');
  const [runningKind, setRunningKind] = useState<'run' | 'submit' | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [consoleTab, setConsoleTab] = useState<'console' | 'testcases' | 'results'>('console');

  // Custom test case state
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [customResult, setCustomResult] = useState<TestResult | null>(null);
  const [customRunning, setCustomRunning] = useState(false);

  // Monthly Judge0 call quota (paid users only) -- always re-fetched from
  // the server after Run/Submit/Run Custom, never decremented optimistically.
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);
  const fetchMonthlyUsage = useCallback(async () => {
    // Cheap client-side skip for the common free-user case -- not the
    // authority. The server's own isPaid (which also checks paid_until)
    // decides what actually renders.
    if (role !== 'paid_users') {
      setMonthlyUsage(null);
      return;
    }
    const token = await getAuthToken(supabase);
    if (!token) {
      setMonthlyUsage(null);
      return;
    }
    const res = await fetch(`${getAppOrigin()}/api/judge0/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setMonthlyUsage(null);
      return;
    }
    setMonthlyUsage(await res.json() as MonthlyUsage);
  }, [supabase, role]);
  useEffect(() => {
    fetchMonthlyUsage();
  }, [fetchMonthlyUsage]);

  // Starts hidden (matches SSR output, avoiding a hydration mismatch) and is
  // revealed from an effect after mount, once localStorage is available --
  // dismissal is global across every problem, not per-problem like the
  // split-pane width in ProblemEditor.
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(HELP_DISMISSED_KEY)) setShowHelp(true);
  }, []);
  const dismissHelp = useCallback(() => {
    setShowHelp(false);
    localStorage.setItem(HELP_DISMISSED_KEY, '1');
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    trackEvent('coding_problem_language_change', { problem_id: meta.id, language: lang });
    setLanguage(lang);
    setCode(starterCode[lang] ?? '');
    setResults([]);
    setCompileError(null);
    setCustomResult(null);
  }, [starterCode, meta.id]);

  const runTests = useCallback(async (kind: 'run' | 'submit') => {
    trackEvent(kind === 'run' ? 'coding_problem_run_click' : 'coding_problem_submit_click', { problem_id: meta.id, language });

    // Run sends only the isSample-tagged cases (always the problem's first
    // N, but selected here by the flag rather than assumed position);
    // Submit sends everything. originalIndex is kept so results map back
    // onto the right entry in the full testCases array regardless of which
    // subset was actually submitted.
    const indexed = testCases.map((tc, i) => ({ tc, originalIndex: i }));
    const selected = kind === 'run' ? indexed.filter((x) => x.tc.isSample) : indexed;

    setRunningKind(kind);
    setResults(selected.map((x) => ({ index: x.originalIndex, status: 'pending' as const, statusDescription: 'Running…', stdout: null, stderr: null, compileOutput: null, time: null, memory: null })));
    setCompileError(null);
    try {
      const token = await getAuthToken(supabase);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const sourceCode = composeSourceCode(harness?.[BASE_LANGUAGE[language] ?? language] ?? '', code, language);
      const res = await fetch(`${getAppOrigin()}/api/judge0/batch`, {
        method: 'POST', headers,
        body: JSON.stringify({
          kind,
          languageId: LANGUAGE_IDS[language],
          sourceCode,
          testCases: selected.map((x) => ({ stdin: x.tc.stdin, expectedOutput: x.tc.expectedOutput })),
          cpuTimeLimit: meta.timeLimitSeconds,
          memoryLimit: meta.memoryLimitKb,
        }),
      });
      if (!res.ok) throw new Error(friendlyErrorMessage(await proxyErrorBody(res)));
      const { results: proxyResults } = await res.json() as { results: ProxyResult[]; cached: boolean };
      const settled: TestResult[] = proxyResults.map((r, k) => {
        const originalIndex = selected[k].originalIndex;
        if (r.compileOutput) return { index: originalIndex, status: 'error' as const, statusDescription: 'Compilation Error', stdout: null, stderr: null, compileOutput: r.compileOutput, time: null, memory: null };
        return { index: originalIndex, status: STATUS_MAP[r.statusId ?? -1] ?? 'error', statusDescription: r.statusDescription, stdout: r.stdout, stderr: r.stderr, compileOutput: null, time: r.time, memory: r.memory };
      });
      const firstCompile = settled.find((r) => r.compileOutput);
      if (firstCompile) setCompileError(firstCompile.compileOutput ?? null);
      setResults(settled);
      trackEvent(kind === 'run' ? 'coding_problem_run_result' : 'coding_problem_submit_result', {
        problem_id: meta.id,
        language,
        passed: settled.filter((r) => r.status === 'accepted').length,
        total: settled.length,
      });
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setRunningKind(null);
      fetchMonthlyUsage();
    }
  }, [code, language, testCases, meta, supabase, fetchMonthlyUsage]);

  const runCustom = useCallback(async () => {
    trackEvent('coding_problem_run_custom_click', { problem_id: meta.id, language });
    setCustomRunning(true);
    setCustomResult(null);
    try {
      const token = await getAuthToken(supabase);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const sourceCode = composeSourceCode(harness?.[BASE_LANGUAGE[language] ?? language] ?? '', code, language);
      const res = await fetch(`${getAppOrigin()}/api/judge0/custom`, {
        method: 'POST', headers,
        body: JSON.stringify({
          languageId: LANGUAGE_IDS[language],
          sourceCode,
          stdin: customInput,
          expectedOutput: customExpected || undefined,
          cpuTimeLimit: meta.timeLimitSeconds,
          memoryLimit: meta.memoryLimitKb,
        }),
      });
      if (!res.ok) throw new Error(friendlyErrorMessage(await proxyErrorBody(res)));
      const r = await res.json() as ProxyCustomResult;
      if (r.compileOutput) {
        setCustomResult({ index: -1, status: 'error', statusDescription: 'Compilation Error', stdout: null, stderr: null, compileOutput: r.compileOutput, time: null, memory: null });
        return;
      }
      setCustomResult({
        index: -1,
        status: STATUS_MAP[r.statusId ?? -1] ?? 'error',
        statusDescription: r.statusDescription,
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: null,
        time: r.time,
        memory: r.memory,
      });
    } catch (err) {
      setCustomResult({ index: -1, status: 'error', statusDescription: err instanceof Error ? err.message : 'Error', stdout: null, stderr: null, compileOutput: null, time: null, memory: null });
    } finally {
      setCustomRunning(false);
      fetchMonthlyUsage();
    }
  }, [code, language, meta, supabase, customInput, customExpected, fetchMonthlyUsage]);

  const sampleCount = testCases.filter((tc) => tc.isSample).length;
  const passed = results.filter((r) => r.status === 'accepted').length;
  const total = results.length;
  const allPassed = results.length > 0 && passed === total;
  const running = runningKind !== null;

  return (
    <div style={{ border: `1px solid ${vars.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Dismissable "how to use this IDE" banner */}
      {showHelp && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--ifm-color-primary-contrast-background)', borderBottom: `1px solid ${vars.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: '1rem', lineHeight: 1.4 }}>💡</span>
          <div style={{ flex: 1, fontSize: '0.78rem', lineHeight: 1.5, color: vars.text }}>
            <strong>How to use this IDE:</strong> Write your solution in the editor below.{' '}
            <strong>▶ Run</strong> checks it against a couple of sample cases, and{' '}
            <strong>⬆ Submit</strong> grades it against the full test suite. Switch languages from the
            dropdown, and try your own input under the <strong>Console</strong> tab.
          </div>
          <button onClick={dismissHelp} aria-label="Dismiss"
            style={{ background: 'transparent', border: 'none', color: vars.textMuted, fontSize: '1rem', lineHeight: 1, cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: vars.surface, borderBottom: `1px solid ${vars.border}`, flexShrink: 0 }}>
        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ background: vars.bg, color: vars.text, border: `1px solid ${vars.border}`, borderRadius: 4, padding: '4px 8px', fontSize: '0.82rem', cursor: 'pointer' }}>
          {Object.keys(starterCode).map((lang) => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] ?? lang}</option>)}
        </select>
        {running && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: vars.textMuted }}>
            ⏳ Running…
          </span>
        )}
        {!running && results.length > 0 && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: allPassed ? vars.green : vars.red }}>
            {passed}/{total} passed
          </span>
        )}
        {monthlyUsage?.isPaid && monthlyUsage.remaining !== null && (
          <span style={{ fontSize: '0.75rem', color: vars.textMuted }}>
            {monthlyUsage.remaining} call{monthlyUsage.remaining === 1 ? '' : 's'} left this month
          </span>
        )}
        <button onClick={() => runTests('run')} disabled={running}
          style={{ marginLeft: 'auto', background: runningKind === 'run' ? vars.borderStrong : vars.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer' }}>
          {runningKind === 'run' ? 'Running…' : `▶ Run (${sampleCount} samples)`}
        </button>
        <button onClick={() => runTests('submit')} disabled={running}
          style={{ background: runningKind === 'submit' ? vars.borderStrong : vars.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer' }}>
          {runningKind === 'submit' ? 'Running…' : `⬆ Submit (${testCases.length} tests)`}
        </button>
      </div>

      {/* Editor — fixed height, scrollable */}
      <div style={{ height: 317, overflow: 'auto', borderBottom: `1px solid ${vars.border}` }}>
        <Editor height="317px" language={MONACO_LANGUAGES[language] ?? language} value={code} onChange={(v) => setCode(v ?? '')} theme={monacoTheme}
          options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, padding: { top: 12 }, autoIndent: 'full', formatOnPaste: true, autoClosingBrackets: 'always', autoClosingQuotes: 'always', tabCompletion: 'on', wordWrap: 'off', detectIndentation: true, suggestOnTriggerCharacters: true }} />
      </div>

      {/* Console panel */}
      <div style={{ flex: 1, borderTop: `1px solid ${vars.border}`, background: vars.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 150 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${vars.border}`, padding: '0 8px', flexShrink: 0 }}>
          {(['console', 'testcases', 'results'] as const).map((tab) => (
            <button key={tab} onClick={() => setConsoleTab(tab)}
              style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${consoleTab === tab ? vars.accent : 'transparent'}`, color: consoleTab === tab ? vars.text : vars.textMuted, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: consoleTab === tab ? 600 : 400 }}>
              {tab === 'console' ? '💻 Console' : tab === 'testcases' ? '📋 Test Cases' : '📊 Results'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {/* CONSOLE TAB */}
          {consoleTab === 'console' && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: vars.textLabel, display: 'block', marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Custom Input (stdin)</label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter your custom input here..."
                    style={{ ...textareaStyle, minHeight: 36 }}
                    rows={2}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: vars.textLabel, display: 'block', marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Expected Output (optional)</label>
                  <textarea
                    value={customExpected}
                    onChange={(e) => setCustomExpected(e.target.value)}
                    placeholder="Expected output..."
                    style={{ ...textareaStyle, minHeight: 36 }}
                    rows={2}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 8 }}>
                <button onClick={runCustom} disabled={customRunning}
                  style={{ background: customRunning ? vars.borderStrong : vars.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '5px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: customRunning ? 'not-allowed' : 'pointer' }}>
                  {customRunning ? 'Running…' : '▶ Run Custom'}
                </button>
                {customResult && <StatusBadge status={customResult.status} description={customResult.statusDescription} />}
                {customResult?.time && <span style={{ color: vars.textLabel, fontSize: '0.75rem' }}>{customResult.time}s</span>}
                {customResult?.memory && <span style={{ color: vars.textLabel, fontSize: '0.75rem' }}>{((customResult.memory ?? 0) / 1024).toFixed(1)} MB</span>}
              </div>
              {customResult && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: vars.textLabel, marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Output</div>
                  {customResult.compileOutput && (
                    <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, marginBottom: 4, maxHeight: 80, overflow: 'auto' }}>{customResult.compileOutput}</pre>
                  )}
                  {customResult.stdout !== null && (
                    <pre style={{ ...preStyle, borderColor: customResult.status === 'accepted' ? vars.greenBorder : vars.red, color: customResult.status === 'accepted' ? vars.green : vars.red, maxHeight: 80, overflow: 'auto' }}>
                      {customResult.stdout || '(empty output)'}
                    </pre>
                  )}
                  {customResult.stderr && (
                    <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, marginTop: 4, maxHeight: 60, overflow: 'auto' }}>{customResult.stderr}</pre>
                  )}
                </div>
              )}
              {!customResult && (
                <div style={{ color: vars.textMuted, fontSize: '0.75rem', padding: '12px 0', textAlign: 'center' }}>
                  Type custom input above and click <strong>Run Custom</strong> to see output
                </div>
              )}
            </div>
          )}

          {/* TEST CASES TAB */}
          {consoleTab === 'testcases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {testCases.map((tc, i) => (
                <div key={i} style={{ background: vars.surface, border: `1px solid ${vars.border}`, borderRadius: 4, padding: '6px 10px' }}>
                  <div style={{ color: vars.textMuted, marginBottom: 3, fontWeight: 600, fontSize: '0.75rem' }}>Case {i + 1}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Input</div>
                      <pre style={{ margin: 0, padding: '3px 6px', background: vars.bg, border: `1px solid ${vars.border}`, borderRadius: 3, color: vars.text, fontSize: '0.72rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 48, overflow: 'auto' }}>{tc.stdin}</pre>
                    </div>
                    <div>
                      <div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Expected Output</div>
                      <pre style={{ margin: 0, padding: '3px 6px', background: vars.bg, border: `1px solid ${vars.border}`, borderRadius: 3, color: vars.green, fontSize: '0.72rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 48, overflow: 'auto' }}>{tc.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RESULTS TAB */}
          {consoleTab === 'results' && (
            <div>
              {compileError && (
                <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, maxHeight: 120, overflow: 'auto' }}>{compileError}</pre>
              )}
              {results.length === 0 && !compileError && (
                <div style={{ color: vars.textMuted, fontSize: '0.75rem', padding: '12px 0', textAlign: 'center' }}>
                  Click <strong>▶ Run</strong> or <strong>⬆ Submit</strong> to test your code against the test cases
                </div>
              )}
              {results.length > 0 && !compileError && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {results.map((r, i) => (
                      <button key={i} onClick={() => setActiveTab(i)}
                        style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === i ? vars.accent : 'transparent'}`, color: activeTab === i ? vars.text : vars.textMuted, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: r.status === 'accepted' ? vars.green : r.status === 'pending' ? vars.textMuted : vars.red }}>●</span>
                        Case {i + 1}
                      </button>
                    ))}
                  </div>
                  {results[activeTab] && (
                    <div style={{ fontSize: '0.76rem' }}>
                      <div style={{ marginBottom: 6 }}>
                        <StatusBadge status={results[activeTab].status} description={results[activeTab].statusDescription} />
                        {results[activeTab].time && <span style={{ color: vars.textLabel, marginLeft: 8 }}>{results[activeTab].time}s</span>}
                        {results[activeTab].memory && <span style={{ color: vars.textLabel, marginLeft: 8 }}>{((results[activeTab].memory ?? 0) / 1024).toFixed(1)} MB</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {/* Looked up by the result's original testCases index, not
                            tab position -- Run only submits the isSample subset,
                            so those two don't always coincide. */}
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Input</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{testCases[results[activeTab].index]?.stdin ?? ''}</pre></div>
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Expected</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{testCases[results[activeTab].index]?.expectedOutput ?? ''}</pre></div>
                      </div>
                      {results[activeTab].stdout !== null && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Your Output</div>
                          <pre style={{ ...preStyle, borderColor: results[activeTab].status === 'accepted' ? vars.greenBorder : vars.red, color: results[activeTab].status === 'accepted' ? vars.green : vars.red, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>
                            {results[activeTab].stdout}
                          </pre>
                        </div>
                      )}
                      {results[activeTab].stderr && (
                        <div style={{ marginTop: 6 }}><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Error</div><pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{results[activeTab].stderr}</pre></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}