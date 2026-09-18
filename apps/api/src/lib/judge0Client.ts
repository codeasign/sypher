import { env } from './env';

// Ported from apps/app/src/lib/judge0Client.ts (2026-09 migration of the
// coding-bootcamp practice feature onto apps/api) — same RapidAPI contract,
// same base64/sentinel/compiler-flag quirks, only the credential source
// changed (env.judge0 instead of raw process.env reads).

const RAPIDAPI_BASE_URL = 'https://judge0-ce.p.rapidapi.com';

const RESULT_FIELDS = 'token,status,stdout,stderr,compile_output,time,memory';

export interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output?: string;
  cpu_time_limit: number;
  memory_limit: number;
  compiler_options?: string;
}

// RapidAPI's TypeScript (id 74) default `--lib` set already includes `dom`
// but stops below es2015, so Set/Map fail to resolve; `--lib` fully REPLACES
// the default rather than adding to it, so the fix restates `dom` alongside
// `es2015`. `--target es2015` is required separately for `for...of` over a
// string. Verified together against a Set/Map problem and a trie/string
// problem in the original apps/app rollout — carried forward unchanged.
const TYPESCRIPT_LANGUAGE_ID = 74;
const TYPESCRIPT_COMPILER_OPTIONS = '--lib es2015,dom --target es2015';

// Single source of truth for both the actual submission and the cache key
// (judge0Cache.ts's computeCacheKey) — a future compiler-flag change shows
// up in the cache key automatically instead of serving stale results.
export function getCompilerOptions(languageId: number): string | undefined {
  if (languageId === TYPESCRIPT_LANGUAGE_ID) return TYPESCRIPT_COMPILER_OPTIONS;
  return undefined;
}

function withCompilerOptions(submission: Judge0Submission): Judge0Submission {
  const compilerOptions = getCompilerOptions(submission.language_id);
  return compilerOptions ? { ...submission, compiler_options: compilerOptions } : submission;
}

// RapidAPI's plain-JSON path (base64_encoded=false) fails to serialize
// compile_output whenever it contains non-ASCII bytes (e.g. GCC's curly
// quotes) — base64 throughout sidesteps it entirely.
function b64encode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}
function b64decode(s: string | null): string | null {
  if (s == null) return null;
  return Buffer.from(s, 'base64').toString('utf8');
}
function encodeSubmission(s: Judge0Submission): Record<string, unknown> {
  const encoded: Record<string, unknown> = {
    source_code: b64encode(s.source_code),
    language_id: s.language_id,
    stdin: b64encode(s.stdin),
    cpu_time_limit: s.cpu_time_limit,
    memory_limit: s.memory_limit,
  };
  if (s.expected_output !== undefined) encoded.expected_output = b64encode(s.expected_output);
  if (s.compiler_options !== undefined) encoded.compiler_options = s.compiler_options;
  return encoded;
}
function decodeResult(r: Judge0Result): Judge0Result {
  return { ...r, stdout: b64decode(r.stdout), stderr: b64decode(r.stderr), compile_output: b64decode(r.compile_output) };
}

export interface Judge0Result {
  token: string;
  status?: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

export class Judge0UpstreamError extends Error {}

// Allowlist of RapidAPI Judge0 CE language ids this editor offers — same
// set as apps/docs's CoreEditor LANGUAGE_IDS (kept in sync manually; the
// apps/web port of that editor must use this exact list). Validated
// server-side so a tampered languageId can't reach RapidAPI at all,
// defense-in-depth on top of the fact that RapidAPI itself would just
// reject an unknown id.
export const JUDGE0_LANGUAGE_IDS: ReadonlySet<number> = new Set([
  71, 70, // python, python27
  63, 62, // javascript, java
  54, 52, 53, // cpp, cpp14, cpp83
  50, 49, 48, // c, c_gcc8, c_gcc7
  51, // csharp
  60, 73, 74, // go, rust, typescript
  78, // kotlin
]);

// Sentinel-delimited grading. Every harness prints this marker immediately
// before its real result output. Grading compares only the content AFTER
// the LAST occurrence of the marker (guards against a student's own debug
// prints coincidentally containing the marker text).
export const SENTINEL_MARKER = '###SYPHER_JUDGE0_RESULT###';

export function extractGradedOutput(stdout: string | null): string | null {
  if (stdout == null) return null;
  const idx = stdout.lastIndexOf(SENTINEL_MARKER);
  if (idx === -1) return stdout;
  return stdout.slice(idx + SENTINEL_MARKER.length).replace(/^\r?\n/, '');
}

export function stripMarkerForDisplay(stdout: string | null): string | null {
  if (stdout == null) return stdout;
  const idx = stdout.lastIndexOf(SENTINEL_MARKER);
  if (idx === -1) return stdout;
  const before = stdout.slice(0, idx);
  const after = stdout.slice(idx + SENTINEL_MARKER.length).replace(/^\r?\n/, '');
  return before + after;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    'X-RapidAPI-Key': env.judge0.rapidApiKey,
    'X-RapidAPI-Host': env.judge0.rapidApiHost,
    ...extra,
  };
}

async function judge0Fetch(path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${RAPIDAPI_BASE_URL}${path}`, init);
  } catch (err) {
    throw new Judge0UpstreamError(err instanceof Error ? err.message : 'Judge0 request failed');
  }
  if (!res.ok) {
    throw new Judge0UpstreamError(`Judge0 upstream returned ${res.status}`);
  }
  return res.json();
}

// RapidAPI's /submissions/batch endpoint hard-caps at 20 items per call.
const RAPIDAPI_BATCH_CHUNK_SIZE = 20;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function submitSingle(submission: Judge0Submission): Promise<{ token: string }> {
  const data = await judge0Fetch('/submissions?base64_encoded=true', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(encodeSubmission(withCompilerOptions(submission))),
  });
  return data as { token: string };
}

export async function pollSingleStatus(token: string): Promise<Judge0Result> {
  const data = await judge0Fetch(
    `/submissions/${token}?base64_encoded=true&fields=${RESULT_FIELDS}`,
    { headers: headers() },
  );
  return decodeResult(data as Judge0Result);
}

export async function submitBatch(submissions: Judge0Submission[]): Promise<{ token: string }[]> {
  const results: { token: string }[] = [];
  for (const group of chunk(submissions, RAPIDAPI_BATCH_CHUNK_SIZE)) {
    const data = await judge0Fetch('/submissions/batch?base64_encoded=true', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ submissions: group.map(withCompilerOptions).map(encodeSubmission) }),
    });
    results.push(...(data as { token: string }[]));
  }
  return results;
}

// ONE billed RapidAPI request per RAPIDAPI_BATCH_CHUNK_SIZE-sized group of
// tokens (never per-token polling).
export async function pollBatchStatus(tokens: string[]): Promise<Judge0Result[]> {
  const results: Judge0Result[] = [];
  for (const group of chunk(tokens, RAPIDAPI_BATCH_CHUNK_SIZE)) {
    const data = await judge0Fetch(
      `/submissions/batch?tokens=${group.join(',')}&base64_encoded=true&fields=${RESULT_FIELDS}`,
      { headers: headers() },
    );
    results.push(...(data as { submissions: Judge0Result[] }).submissions.map(decodeResult));
  }
  return results;
}

function isDone(result: Judge0Result | undefined): boolean {
  return (result?.status?.id ?? 0) > 2;
}

function timedOut(token: string): Judge0Result {
  return {
    token,
    status: { id: -1, description: 'Execution timed out' },
    stdout: null, stderr: null, compile_output: null, time: null, memory: null,
  };
}

interface PollOpts { maxAttempts?: number; intervalMs?: number }

// Submits + polls to completion server-side, so the client makes exactly one
// request-response round trip instead of running its own polling loop.
// Results are correlated back to the caller's submission order by matching
// `token`, not by trusting response array order.
export async function runBatchToCompletion(
  submissions: Judge0Submission[],
  { maxAttempts = 30, intervalMs = 1000 }: PollOpts = {},
): Promise<Judge0Result[]> {
  const tokens = (await submitBatch(submissions)).map((s) => s.token);
  const byToken = new Map<string, Judge0Result>();

  for (let attempt = 0; attempt < maxAttempts && byToken.size < tokens.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, intervalMs));
    const pending = tokens.filter((t) => !byToken.has(t));
    const results = await pollBatchStatus(pending);
    for (const result of results) {
      if (isDone(result)) byToken.set(result.token, result);
    }
  }

  return tokens.map((token) => byToken.get(token) ?? timedOut(token));
}

export async function runSingleToCompletion(
  submission: Judge0Submission,
  { maxAttempts = 30, intervalMs = 1000 }: PollOpts = {},
): Promise<Judge0Result> {
  const { token } = await submitSingle(submission);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, intervalMs));
    const result = await pollSingleStatus(token);
    if (isDone(result)) return result;
  }

  return timedOut(token);
}
