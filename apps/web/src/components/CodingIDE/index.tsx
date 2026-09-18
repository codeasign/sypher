'use client';

import { useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { apiFetch } from '@/lib/api';
import { useColorMode } from '@/hooks/useColorMode';
import { composeSourceCode } from './sourceCompose';
import { CloseFullscreenIcon, OpenInFullIcon } from '@/components/icons/ActionIcons';
import styles from './styles.module.css';

interface TestCase {
  stdin: string;
  expectedOutput: string;
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

interface CodingIDEProps {
  problemId: string;
  timeLimitSeconds: number;
  memoryLimitKb: number;
  sampleTestCases: TestCase[];
  testCaseCount: number;
  starterCode: Record<string, string>;
  harness: Record<string, string>;
  defaultLanguage: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Same allowlist as apps/api's judge0Client.ts JUDGE0_LANGUAGE_IDS — keep
// these two in sync by hand if a language is ever added/removed.
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

const STATUS_MAP: Record<number, TestResult['status']> = {
  3: 'accepted', 4: 'wrong_answer', 5: 'tle', [-1]: 'tle',
};

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

interface ProxyErrorBody {
  message?: string;
  error?: string;
}

async function proxyErrorBody(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as ProxyErrorBody | null;
  return body?.message ?? body?.error ?? `Request failed: ${res.status}`;
}

interface MonthlyUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

// Softer, theme-driven palette (2026-09-18: prior hardcoded neon hex —
// #22C55E/#EF4444/#EAB308 at full saturation, #2563EB/#9333EA buttons —
// read as too harsh/bright, especially in dark mode). Everything below
// derives from the site's own design tokens instead of one-off hex values.
function StatusBadge({ status, description }: { status: TestResult['status']; description: string }): React.JSX.Element {
  const config: Record<TestResult['status'], { bg: string; color: string; icon: string }> = {
    accepted: { bg: 'color-mix(in srgb, var(--ifm-color-success) 16%, transparent)', color: 'var(--ifm-color-success)', icon: '✓' },
    wrong_answer: { bg: 'color-mix(in srgb, var(--ifm-color-danger) 16%, transparent)', color: 'var(--ifm-color-danger)', icon: '✗' },
    tle: { bg: 'color-mix(in srgb, #B08900 16%, transparent)', color: '#B08900', icon: '⏱' },
    error: { bg: 'color-mix(in srgb, var(--ifm-color-danger) 16%, transparent)', color: 'var(--ifm-color-danger)', icon: '!' },
    pending: { bg: 'var(--ifm-color-emphasis-200)', color: 'var(--ifm-color-emphasis-600)', icon: '…' },
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
  accent: 'var(--ifm-color-primary)',
  red: 'var(--ifm-color-danger)',
  redBorder: 'var(--ifm-color-danger-darkest)',
  green: 'var(--ifm-color-success)',
  greenBorder: 'var(--ifm-color-success-dark)',
};

const preStyle: React.CSSProperties = {
  margin: 0, padding: '8px 12px', background: vars.bg,
  border: `1px solid ${vars.border}`, borderRadius: 4, color: vars.text,
  fontSize: '0.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: vars.bg, color: vars.text,
  border: `1px solid ${vars.border}`, borderRadius: 4, padding: '8px 10px',
  fontSize: '0.78rem', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  lineHeight: 1.5, resize: 'none', outline: 'none',
};

// Monaco-based split-layout IDE, ported from apps/docs's CoreEditor
// (2026-09-17 Practice Coding migration). Differences from the original:
// - Talks to apps/api's /coding-problems/judge0/* endpoints via apiFetch
//   (session cookie), not apps/app's Supabase-bearer-token proxy.
// - Sends only { problemId, languageId, sourceCode } (+ stdin/expectedOutput
//   for custom) — testCases and time/memory limits are resolved server-side
//   from problemId now, never sent by the client.
// - Only sample test cases exist client-side; Submit's full-set grading
//   result still returns one entry per hidden case, but this component has
//   no stdin/expectedOutput to show for indices past the sample count (the
//   Results tab falls back to a "Hidden test case" label for those).
// - Monthly usage is shown for every signed-in user, not gated to a paid
//   role — the quota itself is now a flat cap for everyone (see
//   apps/api's judge0Quota.ts).
export default function CodingIDE({
  problemId,
  timeLimitSeconds,
  memoryLimitKb,
  sampleTestCases,
  testCaseCount,
  starterCode,
  harness,
  defaultLanguage,
  fullscreen,
  onToggleFullscreen,
}: CodingIDEProps): React.JSX.Element {
  void timeLimitSeconds;
  void memoryLimitKb;

  const { colorMode } = useColorMode();
  const monacoTheme = colorMode === 'dark' ? 'vs-dark' : 'vs-light';

  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(starterCode[defaultLanguage] ?? '');
  const [runningKind, setRunningKind] = useState<'run' | 'submit' | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [consoleTab, setConsoleTab] = useState<'console' | 'testcases' | 'results'>('console');

  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [customResult, setCustomResult] = useState<TestResult | null>(null);
  const [customRunning, setCustomRunning] = useState(false);

  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);
  const fetchMonthlyUsage = useCallback(async () => {
    const res = await apiFetch('/coding-problems/judge0/usage');
    if (!res.ok) {
      setMonthlyUsage(null);
      return;
    }
    setMonthlyUsage((await res.json()) as MonthlyUsage);
  }, []);
  useEffect(() => {
    fetchMonthlyUsage();
  }, [fetchMonthlyUsage]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(starterCode[lang] ?? '');
    setResults([]);
    setCompileError(null);
    setCustomResult(null);
  }, [starterCode]);

  const runTests = useCallback(async (kind: 'run' | 'submit') => {
    const count = kind === 'run' ? sampleTestCases.length : testCaseCount;
    setRunningKind(kind);
    setResults(Array.from({ length: count }, (_, i) => ({ index: i, status: 'pending' as const, statusDescription: 'Running…', stdout: null, stderr: null, compileOutput: null, time: null, memory: null })));
    setCompileError(null);
    try {
      const sourceCode = composeSourceCode(harness?.[BASE_LANGUAGE[language] ?? language] ?? '', code, language);
      const res = await apiFetch(`/coding-problems/judge0/${kind}`, {
        method: 'POST',
        body: JSON.stringify({ problemId, languageId: LANGUAGE_IDS[language], sourceCode }),
      });
      if (!res.ok) throw new Error(await proxyErrorBody(res));
      const { results: proxyResults } = (await res.json()) as { results: ProxyResult[]; cached: boolean };
      const settled: TestResult[] = proxyResults.map((r) => {
        if (r.compileOutput) return { index: r.index, status: 'error' as const, statusDescription: 'Compilation Error', stdout: null, stderr: null, compileOutput: r.compileOutput, time: null, memory: null };
        return { index: r.index, status: STATUS_MAP[r.statusId ?? -1] ?? 'error', statusDescription: r.statusDescription, stdout: r.stdout, stderr: r.stderr, compileOutput: null, time: r.time, memory: r.memory };
      });
      const firstCompile = settled.find((r) => r.compileOutput);
      if (firstCompile) setCompileError(firstCompile.compileOutput ?? null);
      setResults(settled);
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setRunningKind(null);
      fetchMonthlyUsage();
    }
  }, [code, language, harness, problemId, sampleTestCases.length, testCaseCount, fetchMonthlyUsage]);

  const runCustom = useCallback(async () => {
    setCustomRunning(true);
    setCustomResult(null);
    try {
      const sourceCode = composeSourceCode(harness?.[BASE_LANGUAGE[language] ?? language] ?? '', code, language);
      const res = await apiFetch('/coding-problems/judge0/custom', {
        method: 'POST',
        body: JSON.stringify({
          problemId,
          languageId: LANGUAGE_IDS[language],
          sourceCode,
          stdin: customInput,
          expectedOutput: customExpected || undefined,
        }),
      });
      if (!res.ok) throw new Error(await proxyErrorBody(res));
      const r = (await res.json()) as { statusId: number | undefined; statusDescription: string; stdout: string | null; stderr: string | null; compileOutput: string | null; time: string | null; memory: number | null };
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
  }, [code, language, harness, problemId, customInput, customExpected, fetchMonthlyUsage]);

  const passed = results.filter((r) => r.status === 'accepted').length;
  const total = results.length;
  const allPassed = results.length > 0 && passed === total;
  const running = runningKind !== null;
  const activeResult = results[activeTab];
  const activeSample = activeResult ? sampleTestCases[activeResult.index] : undefined;
  // Fullscreen ("Focus Mode") has far more vertical room to spend on the
  // code editor itself — 20% taller than the normal in-page pane.
  const editorHeight = fullscreen ? 547 : 380;

  return (
    <div style={{ border: `1px solid ${vars.border}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: vars.surface, borderBottom: `1px solid ${vars.border}`, flexShrink: 0 }}>
        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ background: vars.bg, color: vars.text, border: `1px solid ${vars.border}`, borderRadius: 4, padding: '4px 8px', fontSize: '0.82rem', cursor: 'pointer' }}>
          {Object.keys(starterCode).map((lang) => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] ?? lang}</option>)}
        </select>
        {running && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: vars.textMuted }}>⏳ Running…</span>}
        {!running && results.length > 0 && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: allPassed ? vars.green : vars.red }}>
            {passed}/{total} passed
          </span>
        )}
        {monthlyUsage && (
          <span style={{ fontSize: '0.75rem', color: vars.textMuted }}>
            {monthlyUsage.remaining} call{monthlyUsage.remaining === 1 ? '' : 's'} left this month
          </span>
        )}
        {onToggleFullscreen && (
          <button onClick={onToggleFullscreen} title={fullscreen ? 'Exit Focus Mode (Esc)' : 'Focus Mode'}
            style={{ marginLeft: 'auto', height: 32, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--btn-neutral-bg)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
            {fullscreen ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
            {fullscreen ? 'Exit Focus Mode' : 'Focus Mode'}
          </button>
        )}
        <button onClick={() => runTests('run')} disabled={running}
          style={{ marginLeft: onToggleFullscreen ? undefined : 'auto', height: 32, boxSizing: 'border-box', background: runningKind === 'run' ? vars.borderStrong : vars.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: '0.82rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer' }}>
          {runningKind === 'run' ? 'Running…' : `▶ Run (${sampleTestCases.length} samples)`}
        </button>
        <button onClick={() => runTests('submit')} disabled={running}
          style={{ height: 32, boxSizing: 'border-box', background: runningKind === 'submit' ? vars.borderStrong : '#2F855A', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: '0.82rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer' }}>
          {runningKind === 'submit' ? 'Running…' : `⬆ Submit (${testCaseCount} tests)`}
        </button>
      </div>

      <div className={styles.thinScroll} style={{ height: editorHeight, overflow: 'auto', borderBottom: `1px solid ${vars.border}` }}>
        <Editor height={`${editorHeight}px`} language={MONACO_LANGUAGES[language] ?? language} value={code} onChange={(v) => setCode(v ?? '')} theme={monacoTheme}
          options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, padding: { top: 12 }, autoIndent: 'full', formatOnPaste: true, autoClosingBrackets: 'always', autoClosingQuotes: 'always', tabCompletion: 'on', wordWrap: 'off', detectIndentation: true, suggestOnTriggerCharacters: true, scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6, useShadows: false } }} />
      </div>

      <div style={{ flex: 1, borderTop: `1px solid ${vars.border}`, background: vars.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 150 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${vars.border}`, padding: '0 8px', flexShrink: 0 }}>
          {(['console', 'testcases', 'results'] as const).map((tab) => (
            <button key={tab} onClick={() => setConsoleTab(tab)}
              style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${consoleTab === tab ? vars.accent : 'transparent'}`, color: consoleTab === tab ? vars.text : vars.textMuted, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: consoleTab === tab ? 600 : 400 }}>
              {tab === 'console' ? '💻 Console' : tab === 'testcases' ? '📋 Test Cases' : '📊 Results'}
            </button>
          ))}
        </div>

        <div className={styles.thinScroll} style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {consoleTab === 'console' && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: vars.textLabel, display: 'block', marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Custom Input (stdin)</label>
                  <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Enter your custom input here..." style={{ ...textareaStyle, height: 72 }} rows={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: vars.textLabel, display: 'block', marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Expected Output (optional)</label>
                  <textarea value={customExpected} onChange={(e) => setCustomExpected(e.target.value)} placeholder="Expected output..." style={{ ...textareaStyle, height: 72 }} rows={2} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 8 }}>
                <button onClick={runCustom} disabled={customRunning}
                  style={{ background: customRunning ? vars.borderStrong : '#0F766E', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: customRunning ? 'not-allowed' : 'pointer' }}>
                  {customRunning ? 'Running…' : '▶ Run Custom'}
                </button>
                {customResult && <StatusBadge status={customResult.status} description={customResult.statusDescription} />}
                {customResult?.time && <span style={{ color: vars.textLabel, fontSize: '0.75rem' }}>{customResult.time}s</span>}
                {customResult?.memory && <span style={{ color: vars.textLabel, fontSize: '0.75rem' }}>{((customResult.memory ?? 0) / 1024).toFixed(1)} MB</span>}
              </div>
              {customResult ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: vars.textLabel, marginBottom: 4, fontSize: '0.72rem', fontWeight: 600 }}>Output</div>
                  {customResult.compileOutput && <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, marginBottom: 4, maxHeight: 80, overflow: 'auto' }}>{customResult.compileOutput}</pre>}
                  {customResult.stdout !== null && (
                    <pre style={{ ...preStyle, borderColor: customResult.status === 'accepted' ? vars.greenBorder : vars.red, color: customResult.status === 'accepted' ? vars.green : vars.red, maxHeight: 80, overflow: 'auto' }}>
                      {customResult.stdout || '(empty output)'}
                    </pre>
                  )}
                  {customResult.stderr && <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, marginTop: 4, maxHeight: 60, overflow: 'auto' }}>{customResult.stderr}</pre>}
                </div>
              ) : (
                <div style={{ color: vars.textMuted, fontSize: '0.75rem', padding: '12px 0', textAlign: 'center' }}>
                  Type custom input above and click <strong>Run Custom</strong> to see output
                </div>
              )}
            </div>
          )}

          {consoleTab === 'testcases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sampleTestCases.map((tc, i) => (
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
              {testCaseCount > sampleTestCases.length && (
                <div style={{ color: vars.textMuted, fontSize: '0.72rem', padding: '4px 2px' }}>
                  + {testCaseCount - sampleTestCases.length} hidden test case{testCaseCount - sampleTestCases.length === 1 ? '' : 's'}, used only on Submit.
                </div>
              )}
            </div>
          )}

          {consoleTab === 'results' && (
            <div>
              {compileError && <pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, maxHeight: 120, overflow: 'auto' }}>{compileError}</pre>}
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
                  {activeResult && (
                    <div style={{ fontSize: '0.76rem' }}>
                      <div style={{ marginBottom: 6 }}>
                        <StatusBadge status={activeResult.status} description={activeResult.statusDescription} />
                        {activeResult.time && <span style={{ color: vars.textLabel, marginLeft: 8 }}>{activeResult.time}s</span>}
                        {activeResult.memory && <span style={{ color: vars.textLabel, marginLeft: 8 }}>{((activeResult.memory ?? 0) / 1024).toFixed(1)} MB</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Input</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{activeSample?.stdin ?? '(hidden test case)'}</pre></div>
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Expected</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{activeSample?.expectedOutput ?? '(hidden test case)'}</pre></div>
                      </div>
                      {activeResult.stdout !== null && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Your Output</div>
                          <pre style={{ ...preStyle, borderColor: activeResult.status === 'accepted' ? vars.greenBorder : vars.red, color: activeResult.status === 'accepted' ? vars.green : vars.red, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>
                            {activeResult.stdout}
                          </pre>
                        </div>
                      )}
                      {activeResult.stderr && (
                        <div style={{ marginTop: 6 }}><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Error</div><pre style={{ ...preStyle, borderColor: vars.red, color: vars.red, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{activeResult.stderr}</pre></div>
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
