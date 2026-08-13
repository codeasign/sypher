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
// (that's where `console` comes from, since there's no @types/node here) but
// stops below es2015, so Set/Map fail to resolve. `--lib` fully REPLACES the
// default rather than adding to it, so the fix must restate `dom` alongside
// `es2015`, not just add `es2015` alone (verified empirically -- a bare
// `--lib es2015` fixes Set/Map but then breaks `console`).
//
// `--target` is a separate axis from `--lib` -- `--lib` only controls which
// type declarations are visible, `--target` controls what JS syntax the
// compiler accepts/emits. The default target here is old enough to reject
// `for...of` over a string (`error TS2494: ... only supported in
// ECMAScript 5 and higher`), which surfaced on a trie/string problem that
// none of the earlier Set/Map-focused testing happened to exercise.
// `--target es2015` fixes it; verified this doesn't regress the Set/Map fix
// (retested a Map-based problem with both flags together) before shipping.
//
// Applied by an explicit id check, not a default, so it can never leak onto
// another language's compiler flags even if language_id handling changes later.
const TYPESCRIPT_LANGUAGE_ID = 74;
const TYPESCRIPT_COMPILER_OPTIONS = '--lib es2015,dom --target es2015';

// Single source of truth for both the actual submission (below) and the
// cache key (judge0Cache.ts's computeCacheKey) -- so a future compiler-flag
// change for any language shows up in the cache key automatically instead
// of silently serving stale cached results until someone remembers to
// clear the table by hand (exactly what happened before this was wired in).
export function getCompilerOptions(languageId: number): string | undefined {
  if (languageId === TYPESCRIPT_LANGUAGE_ID) return TYPESCRIPT_COMPILER_OPTIONS;
  return undefined;
}

function withCompilerOptions(submission: Judge0Submission): Judge0Submission {
  const compilerOptions = getCompilerOptions(submission.language_id);
  return compilerOptions ? { ...submission, compiler_options: compilerOptions } : submission;
}

// RapidAPI's plain-JSON path (base64_encoded=false) fails to serialize
// compile_output whenever it contains non-ASCII bytes -- which is the common
// case, since GCC's default diagnostics use Unicode curly quotes ('main.c:
// In function 'main':'). That 400 gets surfaced by judge0Fetch as a generic
// 502, meaning EVERY compile error (not just this content) was silently
// broken sitewide. base64 throughout sidesteps it entirely -- confirmed by
// reproducing the 502 with a trivial, unrelated syntax error, then confirming
// a clean Compilation Error result once base64_encoded=true was used both
// ways (request fields in, response fields out).
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

// Sentinel-delimited grading. Every harness prints this marker immediately
// before its real result output (inserted by scripts/insert-sentinel-marker.mjs
// -- see apps/docs's coding-bootcamp content). Grading compares only the
// content AFTER the LAST occurrence of the marker (guards against a
// student's own debug prints coincidentally containing the marker text),
// never Judge0's own expected_output comparison, which has no way to know
// about the marker and would otherwise fail on the polluted raw stdout.
//
// Most problems haven't been through the marker-insertion batch yet (it's
// rolling out language-by-language), so both helpers below must also
// behave correctly when NO marker is present: fall back to the full,
// unmodified stdout, exactly matching pre-marker behavior for those harnesses.
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
    'X-RapidAPI-Key': process.env.JUDGE0_RAPIDAPI_KEY!,
    'X-RapidAPI-Host': process.env.JUDGE0_RAPIDAPI_HOST ?? 'judge0-ce.p.rapidapi.com',
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

// RapidAPI's /submissions/batch endpoint hard-caps at 20 items per call --
// for POST this is the submissions array, for GET (pollBatchStatus below)
// it's the tokens list. Anything larger returns a 400 ("number of
// submissions in a batch should be less than or equal to 20"), which
// judge0Fetch turns into a generic 502 -- meaning Submit was silently
// broken for every problem with more than 20 test cases. Chunking here
// keeps that entirely invisible to callers (runBatchToCompletion, both
// routes) -- order is preserved by concatenating chunk results in order.
const RAPIDAPI_BATCH_CHUNK_SIZE = 20;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

export async function submitSingle(submission: Judge0Submission): Promise<{ token: string }> {
  const data = await judge0Fetch('/submissions?base64_encoded=true', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(encodeSubmission(withCompilerOptions(submission))),
  });
  return data as { token: string };
}

// ONE billed RapidAPI request per RAPIDAPI_BATCH_CHUNK_SIZE-sized group of
// tokens (never per-token polling) -- RapidAPI's batch endpoint caps at 20
// tokens per call the same way it caps submissions (see submitBatch above).
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

export async function pollSingleStatus(token: string): Promise<Judge0Result> {
  const data = await judge0Fetch(
    `/submissions/${token}?base64_encoded=true&fields=${RESULT_FIELDS}`,
    { headers: headers() },
  );
  return decodeResult(data as Judge0Result);
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
