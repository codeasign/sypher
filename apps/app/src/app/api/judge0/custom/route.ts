import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { runSingleToCompletion, extractGradedOutput, stripMarkerForDisplay, Judge0UpstreamError, type Judge0Submission } from '@/lib/judge0Client';
import { isPaidAndActive, getMonthlyStatus, recordMonthlySubmission } from '@/lib/judge0MonthlyLimit';

export const dynamic = 'force-dynamic';

// Same bucket/cost class as judge0:run -- a single ad-hoc submission costs
// RapidAPI the same as one sample Run test case.
const RATE_LIMIT = { limit: 20, windowMs: 10 * 60_000 };

const MAX_SOURCE_CODE_LENGTH = 200_000;
const MAX_STDIN_LENGTH = 50_000;

interface CustomRequestBody {
  languageId?: number;
  sourceCode?: string;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
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

  let body: CustomRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
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
  if (typeof body.stdin !== 'string') {
    return Response.json({ error: 'Missing stdin' }, { status: 400, headers: corsHeaders });
  }
  if (body.stdin.length > MAX_STDIN_LENGTH) {
    return Response.json({ error: 'stdin too large' }, { status: 400, headers: corsHeaders });
  }
  if (typeof body.cpuTimeLimit !== 'number' || typeof body.memoryLimit !== 'number') {
    return Response.json({ error: 'Missing cpuTimeLimit or memoryLimit' }, { status: 400, headers: corsHeaders });
  }

  if (!(await rateLimit(`judge0:run:${user.id}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs))) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  // Monthly cap is a paid-tier feature -- a Custom run costs RapidAPI the
  // same as any other call, so it draws from the same pool as batch/route.ts's
  // Run and Submit. See batch/route.ts for the full rationale.
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

  // Never send expected_output to Judge0 -- same reasoning as batch/route.ts:
  // its raw-stdout comparison can't account for the harness's sentinel
  // marker. Self-grade below instead, only when the student typed an
  // expected value.
  const submission: Judge0Submission = {
    source_code: body.sourceCode,
    language_id: body.languageId,
    stdin: body.stdin,
    cpu_time_limit: body.cpuTimeLimit,
    memory_limit: body.memoryLimit,
  };

  let result;
  try {
    result = await runSingleToCompletion(submission);
  } catch (err) {
    if (err instanceof Judge0UpstreamError) {
      return Response.json({ error: 'Judge0 upstream error' }, { status: 502, headers: corsHeaders });
    }
    throw err;
  }

  // Same infra-failure exclusion as batch/route.ts's cache-write guard --
  // runSingleToCompletion uses the identical timedOut() sentinel
  // (status.id === -1) as runBatchToCompletion, so a request that never
  // reached a real Judge0 verdict doesn't cost the user their monthly quota.
  const hasTimeout = result.status?.id === -1;
  if (isPaidCaller && !hasTimeout) {
    await recordMonthlySubmission(user.id);
  }

  const displayStdout = stripMarkerForDisplay(result.stdout);
  let statusId = result.status?.id;
  let statusDescription = result.status?.description ?? 'Unknown';
  if (statusId === 3 && body.expectedOutput) {
    const graded = extractGradedOutput(result.stdout);
    const correct = (graded ?? '').trim() === body.expectedOutput.trim();
    if (!correct) {
      statusId = 4;
      statusDescription = 'Wrong Answer';
    }
  }

  return Response.json(
    {
      statusId,
      statusDescription,
      stdout: displayStdout,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      time: result.time,
      memory: result.memory,
    },
    { status: 200, headers: corsHeaders }
  );
}
