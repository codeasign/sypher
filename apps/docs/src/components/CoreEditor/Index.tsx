import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useColorMode } from '@docusaurus/theme-common';

interface TestCase {
  stdin: string;
  expectedOutput: string;
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

const LANGUAGE_IDS: Record<string, number> = {
  python: 71, python27: 70, python36: 34, python35: 35,
  javascript: 63, java: 62, java8: 27,
  cpp: 54, cpp14: 52, cpp83: 53,
  c: 50, c_gcc8: 49, c_gcc7: 48,
  csharp: 51, csharp_mono54: 16, csharp_mono52: 17,
  go: 60, rust: 73, rust120: 42, typescript: 74,
  // Search/Sorting Algorithms 9-language set. IDs are best-known placeholders
  // against the public Judge0 CE demo instance — verify/update once the user's
  // custom Judge0 docker image (exact versions: Python 3.11, GCC 13, Clang 17,
  // Java 21, .NET 8, Node 20.10.0, TypeScript 5.1.6, Rust 1.79.0, Go 1.22) is live.
  python311: 92, c_gcc13: 103, cpp_clang17: 76, java21: 91, csharp_dotnet8: 51,
  javascript_node20: 97, typescript516: 94, rust179: 108, go122: 106,
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python 3.8', python27: 'Python 2.7',
  python36: 'Python 3.6', python35: 'Python 3.5',
  javascript: 'JavaScript (ECMA)',
  java: 'Java (OpenJDK 13)', java8: 'Java 8 (OpenJDK 8)',
  cpp: 'C++ 17 (GCC 9.2)', cpp14: 'C++ 14 (GCC 7.4)', cpp83: 'C++ (GCC 8.3)',
  c: 'C (GCC 9.2)', c_gcc8: 'C (GCC 8.3)', c_gcc7: 'C (GCC 7.4)',
  csharp: 'C# (Mono 6.6)', csharp_mono54: 'C# (Mono 5.4)',
  csharp_mono52: 'C# (Mono 5.2)',
  go: 'Go 1.13', rust: 'Rust 1.40', rust120: 'Rust 1.20',
  typescript: 'TypeScript 3.7',
  python311: 'Python 3.11', c_gcc13: 'C (GCC 13)', cpp_clang17: 'C++ (Clang 17)',
  java21: 'Java 21', csharp_dotnet8: 'C# / .NET 8',
  javascript_node20: 'JavaScript (Node 20.10.0)', typescript516: 'TypeScript 5.1.6',
  rust179: 'Rust 1.79.0', go122: 'Go 1.22',
};

const MONACO_LANGUAGES: Record<string, string> = {
  python27: 'python', python36: 'python', python35: 'python',
  java8: 'java',
  cpp14: 'cpp', cpp83: 'cpp',
  c: 'c', c_gcc8: 'c', c_gcc7: 'c',
  csharp: 'csharp', csharp_mono54: 'csharp', csharp_mono52: 'csharp',
  rust120: 'rust',
  python311: 'python', c_gcc13: 'c', cpp_clang17: 'cpp', java21: 'java',
  csharp_dotnet8: 'csharp', javascript_node20: 'javascript',
  typescript516: 'typescript', rust179: 'rust', go122: 'go',
};

const BASE_LANGUAGE: Record<string, string> = {
  python27: 'python27', python36: 'python', python35: 'python',
  java8: 'java', cpp14: 'cpp', cpp83: 'cpp',
  c_gcc8: 'c', c_gcc7: 'c',
  csharp_mono54: 'csharp', csharp_mono52: 'csharp',
  rust120: 'rust',
};

const STATUS_MAP: Record<number, TestResult['status']> = {
  3: 'accepted', 4: 'wrong_answer', 5: 'tle',
};

async function pollSubmission(
  token: string, baseUrl: string, authToken: string,
  maxAttempts = 20, intervalMs = 800,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (authToken) headers['X-Auth-Token'] = authToken;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(
      `${baseUrl}/submissions/${token}?fields=status,stdout,stderr,compile_output,time,memory`,
      { headers },
    );
    if (!res.ok) throw new Error(`Poll error: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    if ((data.status as Record<string, number>)?.id > 2) return data;
  }
  throw new Error('Execution timed out');
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

const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: vars.bg, color: vars.text,
  border: `1px solid ${vars.border}`, borderRadius: 4, padding: '8px 10px',
  fontSize: '0.78rem', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  lineHeight: 1.5, resize: 'vertical', minHeight: 48, outline: 'none',
};

export default function CodeEditor({ meta, testCases, starterCode, harness, defaultLanguage = 'python' }: CodeEditorProps): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const baseUrl = siteConfig.customFields.judge0BaseUrl as string;
  const authToken = siteConfig.customFields.judge0AuthToken as string;

  const { colorMode } = useColorMode();
  const monacoTheme = colorMode === 'dark' ? 'vs-dark' : 'vs-light';

  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(starterCode[defaultLanguage] ?? '');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [consoleTab, setConsoleTab] = useState<'console' | 'testcases' | 'results'>('console');

  // Custom test case state
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [customResult, setCustomResult] = useState<TestResult | null>(null);
  const [customRunning, setCustomRunning] = useState(false);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(starterCode[lang] ?? '');
    setResults([]);
    setCompileError(null);
    setCustomResult(null);
  }, [starterCode]);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults(testCases.map((_, i) => ({ index: i, status: 'pending' as const, statusDescription: 'Running…', stdout: null, stderr: null, compileOutput: null, time: null, memory: null })));
    setCompileError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-Auth-Token'] = authToken;
      const res = await fetch(`${baseUrl}/submissions/batch?base64_encoded=false`, {
        method: 'POST', headers,
        body: JSON.stringify({
          submissions: testCases.map((tc) => ({
            source_code: (() => {
              const h = harness?.[BASE_LANGUAGE[language] ?? language] ?? '';
              return h ? h + '\n' + code : code;
            })(), language_id: LANGUAGE_IDS[language],
            stdin: tc.stdin, expected_output: tc.expectedOutput,
            cpu_time_limit: meta.timeLimitSeconds, memory_limit: meta.memoryLimitKb,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      const tokens = await res.json() as Array<{ token: string }>;
      const settled = await Promise.all(tokens.map(async ({ token }, i) => {
        try {
          const data = await pollSubmission(token, baseUrl, authToken);
          const statusId = (data.status as Record<string, number>)?.id;
          const compileOut = data.compile_output as string | null;
          if (compileOut) return { index: i, status: 'error' as const, statusDescription: 'Compilation Error', stdout: null, stderr: null, compileOutput: compileOut, time: null, memory: null };
          return { index: i, status: STATUS_MAP[statusId] ?? 'error', statusDescription: (data.status as Record<string, string>)?.description ?? 'Unknown', stdout: data.stdout as string | null, stderr: data.stderr as string | null, compileOutput: null, time: data.time as string | null, memory: data.memory as number | null };
        } catch (err) {
          return { index: i, status: 'error' as const, statusDescription: err instanceof Error ? err.message : 'Error', stdout: null, stderr: null, compileOutput: null, time: null, memory: null };
        }
      }));
      const firstCompile = settled.find((r) => r.compileOutput);
      if (firstCompile) setCompileError(firstCompile.compileOutput ?? null);
      setResults(settled);
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setRunning(false);
    }
  }, [code, language, testCases, meta, baseUrl, authToken]);

  const runCustom = useCallback(async () => {
    setCustomRunning(true);
    setCustomResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-Auth-Token'] = authToken;
      const sourceCode = (() => {
        const h = harness?.[BASE_LANGUAGE[language] ?? language] ?? '';
        return h ? h + '\n' + code : code;
      })();
      const res = await fetch(`${baseUrl}/submissions?base64_encoded=false`, {
        method: 'POST', headers,
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: LANGUAGE_IDS[language],
          stdin: customInput,
          expected_output: customExpected || undefined,
          cpu_time_limit: meta.timeLimitSeconds,
          memory_limit: meta.memoryLimitKb,
        }),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      const { token } = await res.json() as { token: string };
      const data = await pollSubmission(token, baseUrl, authToken);
      const statusId = (data.status as Record<string, number>)?.id;
      const compileOut = data.compile_output as string | null;
      if (compileOut) {
        setCustomResult({ index: -1, status: 'error', statusDescription: 'Compilation Error', stdout: null, stderr: null, compileOutput: compileOut, time: null, memory: null });
        return;
      }
      setCustomResult({
        index: -1,
        status: STATUS_MAP[statusId] ?? 'error',
        statusDescription: (data.status as Record<string, string>)?.description ?? 'Unknown',
        stdout: data.stdout as string | null,
        stderr: data.stderr as string | null,
        compileOutput: null,
        time: data.time as string | null,
        memory: data.memory as number | null,
      });
    } catch (err) {
      setCustomResult({ index: -1, status: 'error', statusDescription: err instanceof Error ? err.message : 'Error', stdout: null, stderr: null, compileOutput: null, time: null, memory: null });
    } finally {
      setCustomRunning(false);
    }
  }, [code, language, meta, baseUrl, authToken, customInput, customExpected]);

  const passed = results.filter((r) => r.status === 'accepted').length;
  const total = testCases.length;
  const allPassed = results.length > 0 && passed === total;

  return (
    <div style={{ border: `1px solid ${vars.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: vars.surface, borderBottom: `1px solid ${vars.border}`, flexShrink: 0 }}>
        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ background: vars.bg, color: vars.text, border: `1px solid ${vars.border}`, borderRadius: 4, padding: '4px 8px', fontSize: '0.82rem', cursor: 'pointer' }}>
          {Object.keys(starterCode).map((lang) => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] ?? lang}</option>)}
        </select>
        {results.length > 0 && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: allPassed ? vars.green : vars.red }}>
            {passed}/{total} passed
          </span>
        )}
        <button onClick={runAll} disabled={running}
          style={{ marginLeft: 'auto', background: running ? vars.borderStrong : vars.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer' }}>
          {running ? 'Running…' : `▶ Run (${total} tests)`}
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
                  Click <strong>▶ Run</strong> to test your code against the predefined test cases
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
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Input</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{testCases[activeTab]?.stdin ?? ''}</pre></div>
                        <div><div style={{ color: vars.textLabel, marginBottom: 2, fontSize: '0.7rem' }}>Expected</div><pre style={{ ...preStyle, fontSize: '0.72rem', maxHeight: 60, overflow: 'auto' }}>{testCases[activeTab]?.expectedOutput ?? ''}</pre></div>
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