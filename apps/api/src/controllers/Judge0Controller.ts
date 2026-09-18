import { Body, Controller, Get, Post, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { CodingProblemRepository } from '../repositories/CodingProblemRepository';
import {
  JUDGE0_LANGUAGE_IDS,
  Judge0UpstreamError,
  extractGradedOutput,
  getCompilerOptions,
  runBatchToCompletion,
  runSingleToCompletion,
  stripMarkerForDisplay,
  type Judge0Submission,
} from '../lib/judge0Client';
import { computeCacheKey, getCachedResult, setCachedResult } from '../lib/judge0Cache';
import { getMonthlyStatus, recordMonthlySubmission } from '../lib/judge0Quota';
import { consumeJudge0RunAllowance, consumeJudge0SubmitAllowance } from '../lib/rateLimit';
import { setPrivateNoStoreCache } from '../lib/httpCache';

const codingProblemRepository = new CodingProblemRepository();

const MAX_SOURCE_CODE_LENGTH = 200_000;
const MAX_STDIN_LENGTH = 50_000;
// Hard ceiling independent of whatever a problem row declares -- a
// corrupted/malicious problem row can't be used to buy an oversized Judge0
// run. Every problem authored so far uses seconds/hundreds-of-KB scale
// values well under this.
const MAX_CPU_TIME_LIMIT_SECONDS = 10;
const MAX_MEMORY_LIMIT_KB = 512_000;
// Defensive ceiling on how many test cases one run/submit call can batch to
// Judge0 -- testCases here comes from the DB (findExecutionContextById),
// not the client body, but nothing today stops a future authoring path
// from seeding an oversized array for a given problem row; this caps the
// blast radius the same way MAX_IMPORT_ROWS bounds CompanyAdminController's
// CSV import. Every problem authored so far uses well under this.
const MAX_TEST_CASES = 100;

interface RunRequest {
  problemId: string;
  languageId: number;
  sourceCode: string;
}

interface CustomRunRequest extends RunRequest {
  stdin: string;
  expectedOutput?: string;
}

interface Judge0MessageResponse {
  message: string;
}

export interface Judge0TrimmedResult {
  index: number;
  statusId: number | undefined;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

export interface Judge0BatchResponse {
  results: Judge0TrimmedResult[];
  cached: boolean;
}

export interface Judge0CustomResponse {
  statusId: number | undefined;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

export interface Judge0UsageResponse {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function trim(results: { status?: { id: number; description: string }; stdout: string | null; stderr: string | null; compile_output: string | null; time: string | null; memory: number | null }[]): Judge0TrimmedResult[] {
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

// Judge0 execution proxy for the "Practice Coding" feature. Ported from
// apps/app's /api/judge0/* routes (2026-09-17 migration): same RapidAPI
// credential (JUDGE0_RAPIDAPI_KEY, server-only env var — never sent to the
// client in any response), same cache/rate-limit/quota shape, but the
// RapidAPI key never even reaches request handling code paths a client can
// influence. The one deliberate change from the original design: test
// cases and time/memory limits are ALWAYS looked up server-side by
// problemId here, never accepted from the client body — the original
// apps/app routes trusted the caller's testCases/expectedOutput/limits
// wholesale, which meant a tampered request could grade itself "correct"
// or demand an oversized run. A flat 100-calls/month cap applies to every
// user (not just paid, unlike the original) per 2026-09-17 product
// decision — simpler, and RapidAPI bills per call for everyone.
@Route('coding-problems/judge0')
@Tags('Judge0')
@Security('session')
export class Judge0Controller extends Controller {
  @Get('usage')
  public async usage(@Request() request: ExpressRequest): Promise<Judge0UsageResponse> {
    setPrivateNoStoreCache(this);
    return getMonthlyStatus((request.user as User).id);
  }

  @Post('run')
  public async run(
    @Body() body: RunRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, Judge0MessageResponse>,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() tooManyRequests: TsoaResponse<429, Judge0MessageResponse, { 'Retry-After': string }>,
    @Res() upstreamError: TsoaResponse<502, Judge0MessageResponse>,
  ): Promise<Judge0BatchResponse | void> {
    const user = request.user as User;
    const validated = await this.validateAndLoad(body, notFound, badRequest);
    if (!validated) return undefined;
    const { problem, testCases } = validated;

    const samples = testCases.filter((tc) => tc.isSample);
    if (samples.length === 0) return badRequest(400, { message: 'Problem has no sample test cases' });

    const retryAfter = await consumeJudge0RunAllowance(user.id);
    if (retryAfter > 0) {
      return tooManyRequests(429, { message: 'Too many run requests. Please wait and try again.' }, { 'Retry-After': String(retryAfter) });
    }

    return this.executeBatch(user.id, body.languageId, body.sourceCode, samples, problem, upstreamError);
  }

  @Post('submit')
  public async submit(
    @Body() body: RunRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, Judge0MessageResponse>,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() tooManyRequests: TsoaResponse<429, Judge0MessageResponse, { 'Retry-After': string }>,
    @Res() upstreamError: TsoaResponse<502, Judge0MessageResponse>,
  ): Promise<Judge0BatchResponse | void> {
    const user = request.user as User;
    const validated = await this.validateAndLoad(body, notFound, badRequest);
    if (!validated) return undefined;
    const { problem, testCases } = validated;

    const retryAfter = await consumeJudge0SubmitAllowance(user.id);
    if (retryAfter > 0) {
      return tooManyRequests(429, { message: 'Too many submit requests. Please wait and try again.' }, { 'Retry-After': String(retryAfter) });
    }

    return this.executeBatch(user.id, body.languageId, body.sourceCode, testCases, problem, upstreamError);
  }

  @Post('custom')
  public async custom(
    @Body() body: CustomRunRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, Judge0MessageResponse>,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() tooManyRequests: TsoaResponse<429, Judge0MessageResponse, { 'Retry-After': string }>,
    @Res() upstreamError: TsoaResponse<502, Judge0MessageResponse>,
  ): Promise<Judge0CustomResponse | void> {
    const user = request.user as User;
    const validated = await this.validateAndLoad(body, notFound, badRequest);
    if (!validated) return undefined;
    const { problem } = validated;

    if (typeof body.stdin !== 'string' || body.stdin.length > MAX_STDIN_LENGTH) {
      return badRequest(400, { message: 'Invalid stdin' });
    }

    // Same cost class as Run -- a single ad-hoc submission draws from the
    // same 10-minute Run bucket as batch runs.
    const retryAfter = await consumeJudge0RunAllowance(user.id);
    if (retryAfter > 0) {
      return tooManyRequests(429, { message: 'Too many run requests. Please wait and try again.' }, { 'Retry-After': String(retryAfter) });
    }

    const monthly = await getMonthlyStatus(user.id);
    if (monthly.remaining <= 0) {
      return upstreamError(502, { message: `Monthly call limit reached. Resets ${monthly.resetsAt}.` });
    }

    const submission: Judge0Submission = {
      source_code: body.sourceCode,
      language_id: body.languageId,
      stdin: body.stdin,
      cpu_time_limit: Math.min(problem.timeLimitSeconds, MAX_CPU_TIME_LIMIT_SECONDS),
      memory_limit: Math.min(problem.memoryLimitKb, MAX_MEMORY_LIMIT_KB),
    };

    let result;
    try {
      result = await runSingleToCompletion(submission);
    } catch (err) {
      if (err instanceof Judge0UpstreamError) return upstreamError(502, { message: 'Judge0 upstream error' });
      throw err;
    }

    const hasTimeout = result.status?.id === -1;
    if (!hasTimeout) await recordMonthlySubmission(user.id);

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

    return {
      statusId,
      statusDescription,
      stdout: displayStdout,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      time: result.time,
      memory: result.memory,
    };
  }

  private async validateAndLoad(
    body: RunRequest,
    notFound: TsoaResponse<404, void>,
    badRequest: TsoaResponse<400, Judge0MessageResponse>,
  ): Promise<{ problem: { timeLimitSeconds: number; memoryLimitKb: number }; testCases: { stdin: string; expectedOutput: string; isSample: boolean }[] } | null> {
    if (typeof body.problemId !== 'string' || !body.problemId) {
      badRequest(400, { message: 'Missing problemId' });
      return null;
    }
    if (typeof body.languageId !== 'number' || !JUDGE0_LANGUAGE_IDS.has(body.languageId)) {
      badRequest(400, { message: 'Unsupported languageId' });
      return null;
    }
    if (typeof body.sourceCode !== 'string' || body.sourceCode.length === 0 || body.sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      badRequest(400, { message: 'Invalid sourceCode' });
      return null;
    }

    // problemId is the CodingProblem.id (that's what detail/bookmark
    // responses hand back to the client, never the slug) — test cases and
    // limits are always resolved server-side from this id, never trusted
    // from the request body.
    const loaded = await codingProblemRepository.findExecutionContextById(body.problemId);
    if (!loaded) {
      notFound(404);
      return null;
    }
    return {
      problem: { timeLimitSeconds: loaded.timeLimitSeconds, memoryLimitKb: loaded.memoryLimitKb },
      testCases: loaded.testCases.slice(0, MAX_TEST_CASES),
    };
  }

  private async executeBatch(
    userId: string,
    languageId: number,
    sourceCode: string,
    testCases: { stdin: string; expectedOutput: string; isSample: boolean }[],
    problem: { timeLimitSeconds: number; memoryLimitKb: number },
    upstreamError: TsoaResponse<502, Judge0MessageResponse>,
  ): Promise<Judge0BatchResponse | void> {
    const cpuTimeLimit = Math.min(problem.timeLimitSeconds, MAX_CPU_TIME_LIMIT_SECONDS);
    const memoryLimit = Math.min(problem.memoryLimitKb, MAX_MEMORY_LIMIT_KB);
    const compilerOptions = getCompilerOptions(languageId);

    const cacheKey = computeCacheKey(languageId, sourceCode, testCases, compilerOptions);
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return { results: trim(cached), cached: true };
    }

    const monthly = await getMonthlyStatus(userId);
    if (monthly.remaining <= 0) {
      return upstreamError(502, { message: `Monthly call limit reached. Resets ${monthly.resetsAt}.` });
    }

    const submissions: Judge0Submission[] = testCases.map((tc) => ({
      source_code: sourceCode,
      language_id: languageId,
      stdin: tc.stdin,
      cpu_time_limit: cpuTimeLimit,
      memory_limit: memoryLimit,
    }));

    let results;
    try {
      results = await runBatchToCompletion(submissions);
    } catch (err) {
      if (err instanceof Judge0UpstreamError) return upstreamError(502, { message: 'Judge0 upstream error' });
      throw err;
    }

    // Never sent expected_output to Judge0 -- self-grade here instead,
    // same sentinel-marker-aware comparison as the original apps/app design.
    results = results.map((r, i) => {
      const displayStdout = stripMarkerForDisplay(r.stdout);
      if (r.status?.id !== 3) return { ...r, stdout: displayStdout };
      const graded = extractGradedOutput(r.stdout);
      const correct = (graded ?? '').trim() === testCases[i].expectedOutput.trim();
      return { ...r, stdout: displayStdout, status: correct ? r.status : { id: 4, description: 'Wrong Answer' } };
    });

    const hasTimeout = results.some((r) => r.status?.id === -1);
    if (!hasTimeout) {
      await setCachedResult(cacheKey, results);
      await recordMonthlySubmission(userId);
    }

    return { results: trim(results), cached: false };
  }
}
