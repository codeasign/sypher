import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { runBatchToCompletion, getCompilerOptions, extractGradedOutput, stripMarkerForDisplay, Judge0UpstreamError, type Judge0Submission, type Judge0Result } from '@/lib/judge0Client';
import { computeCacheKey, getCachedResult, setCachedResult } from '@/lib/judge0Cache';
import { isPaidAndActive, getMonthlyStatus, recordMonthlySubmission } from '@/lib/judge0MonthlyLimit';

export const dynamic = 'force-dynamic';

// Submit costs ~10x Run in RapidAPI calls -- separate buckets so a student
// spamming Submit can't burn through budget meant for iterative Run clicks.
const RATE_LIMITS = {
  run: { limit: 20, windowMs: 10 * 60_000 },
  submit: { limit: 3, windowMs: 10 * 60_000 },
} as const;

// Defense-in-depth: stops a client from dodging the cheaper Run bucket by
// mislabeling a large batch as kind:"run".
const MAX_TEST_CASES = { run: 10, submit: 200 } as const;
const MAX_SOURCE_CODE_LENGTH = 200_000;

interface BatchRequestBody {
  kind?: 'run' | 'submit';
  languageId?: number;
  sourceCode?: string;
  testCases?: { stdin?: string; expectedOutput?: string }[];
  cpuTimeLimit?: number;
  memoryLimit?: number;
}

interface TrimmedResult {
  index: number;
  statusId: number | undefined;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

function trim(results: Judge0Result[]): TrimmedResult[] {
  return results.map((r, index) => ({
    index,
    statusId: r.status?.id,
    statusDescription: r.status?.description ?? 'Unknown',
    stdout: r.stdout,
    stderr: r.stderr,
    compileOutput: r.compile_output,
    time: r.time,
    memory: r.memory,
  }));
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers: corsHeaders });
  }

  let body: BatchRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }

  const kind = body.kind;
  if (kind !== 'run' && kind !== 'submit') {
    return Response.json({ error: 'kind must be "run" or "submit"' }, { status: 400, headers: corsHeaders });
  }
  if (typeof body.languageId !== 'number') {
    return Response.json({ error: 'Missing languageId' }, { status: 400, headers: corsHeaders });
  }
  if (typeof body.sourceCode !== 'string' || body.sourceCode.length === 0) {
    return Response.json({ error: 'Missing sourceCode' }, { status: 400, headers: corsHeaders });
  }
  if (body.sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
    return Response.json({ error: 'sourceCode too large' }, { status: 400, headers: corsHeaders });
  }
  if (!Array.isArray(body.testCases) || body.testCases.length === 0) {
    return Response.json({ error: 'Missing testCases' }, { status: 400, headers: corsHeaders });
  }
  if (body.testCases.length > MAX_TEST_CASES[kind]) {
    return Response.json({ error: `Too many testCases for kind "${kind}"` }, { status: 400, headers: corsHeaders });
  }
  if (typeof body.cpuTimeLimit !== 'number' || typeof body.memoryLimit !== 'number') {
    return Response.json({ error: 'Missing cpuTimeLimit or memoryLimit' }, { status: 400, headers: corsHeaders });
  }

  const sourceCode = body.sourceCode;
  const cpuTimeLimit = body.cpuTimeLimit;
  const memoryLimit = body.memoryLimit;
  const testCases = body.testCases.map((tc) => ({
    stdin: typeof tc.stdin === 'string' ? tc.stdin : '',
    expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : '',
  }));

  const cacheKey = computeCacheKey(body.languageId, sourceCode, testCases, getCompilerOptions(body.languageId));

  // Cache lookup before the rate limiter -- a cache hit costs RapidAPI
  // nothing, so it shouldn't consume the user's quota.
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return Response.json({ results: trim(cached), cached: true }, { status: 200, headers: corsHeaders });
  }

  const { limit, windowMs } = RATE_LIMITS[kind];
  if (!(await rateLimit(`judge0:${kind}:${user.id}`, limit, windowMs))) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  // Monthly cap is a paid-tier feature, separate from the 10-minute rolling
  // buckets above -- covers every call regardless of kind (Run costs
  // RapidAPI the same as Submit in aggregate), gated only for paid+active
  // users (re-derived server-side, never trusted from the client).
  const isPaidCaller = await isPaidAndActive(user.id);
  if (isPaidCaller) {
    const monthly = await getMonthlyStatus(user.id);
    if (monthly && monthly.remaining <= 0) {
      return Response.json(
        {
          error: `Monthly call limit reached. Resets on ${new Date(monthly.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
          code: 'monthly_limit_reached',
          resetsAt: monthly.resetsAt,
        },
        { status: 429, headers: corsHeaders }
      );
    }
  }

  // Never send expected_output to Judge0 -- grading is done entirely
  // server-side below via extractGradedOutput, which strips the harness's
  // sentinel marker (when present) before comparing. Judge0's own raw-stdout
  // comparison has no way to know about the marker (would fail on the
  // polluted stdout for converted harnesses) and separately has a known
  // null-vs-'' mismatch for genuinely empty output -- self-grading sidesteps
  // both permanently instead of special-casing either.
  const submissions: Judge0Submission[] = testCases.map((tc) => ({
    source_code: sourceCode,
    language_id: body.languageId!,
    stdin: tc.stdin,
    cpu_time_limit: cpuTimeLimit,
    memory_limit: memoryLimit,
  }));

  let results: Judge0Result[];
  try {
    results = await runBatchToCompletion(submissions);
  } catch (err) {
    if (err instanceof Judge0UpstreamError) {
      return Response.json({ error: 'Judge0 upstream error' }, { status: 502, headers: corsHeaders });
    }
    throw err;
  }

  // Judge0 grants "Accepted" for any successful (exit-0) run since we never
  // send expected_output; downgrade to "Wrong Answer" here when our own
  // comparison disagrees. A genuine compile/runtime/TLE failure is left
  // untouched (its status is never 3). stdout is always rewritten to the
  // marker-stripped display form, whether the answer was right or wrong.
  results = results.map((r, i) => {
    const displayStdout = stripMarkerForDisplay(r.stdout);
    if (r.status?.id !== 3) return { ...r, stdout: displayStdout };
    const graded = extractGradedOutput(r.stdout);
    const correct = (graded ?? '').trim() === testCases[i].expectedOutput.trim();
    return { ...r, stdout: displayStdout, status: correct ? r.status : { id: 4, description: 'Wrong Answer' } };
  });

  // An infra-side timeout shouldn't get memorized as a deterministic verdict.
  const hasTimeout = results.some((r) => r.status?.id === -1);
  if (!hasTimeout) {
    await setCachedResult(cacheKey, results);
  }

  // Same infra-failure exclusion as the cache write above -- a request that
  // never reached a real Judge0 verdict shouldn't cost the user their
  // monthly quota.
  if (isPaidCaller && !hasTimeout) {
    await recordMonthlySubmission(user.id);
  }

  return Response.json({ results: trim(results), cached: false }, { status: 200, headers: corsHeaders });
}
