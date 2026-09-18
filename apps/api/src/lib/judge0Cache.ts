import crypto from 'crypto';
import { prisma } from './prisma';
import type { Judge0Result } from './judge0Client';

interface CacheTestCase {
  stdin: string;
  expectedOutput: string;
}

// sourceCode is the already harness-composed string (harness + student
// code), matching what actually gets submitted to Judge0. compilerOptions
// must be included (see judge0Client.ts's getCompilerOptions) so two
// requests with identical language/code/testCases but different flags don't
// collide on the same cache key.
export function computeCacheKey(
  languageId: number,
  sourceCode: string,
  testCases: CacheTestCase[],
  compilerOptions?: string,
): string {
  const hash = crypto.createHash('sha256');
  hash.update(String(languageId));
  hash.update(sourceCode);
  hash.update(JSON.stringify(testCases.map((tc) => ({ stdin: tc.stdin, expectedOutput: tc.expectedOutput }))));
  hash.update(compilerOptions ?? '');
  return hash.digest('hex');
}

export async function getCachedResult(cacheKey: string): Promise<Judge0Result[] | null> {
  const row = await prisma.judge0SubmissionCache.findUnique({ where: { cacheKey } });
  return (row?.result as unknown as Judge0Result[] | undefined) ?? null;
}

// Never throws — a cache write failure shouldn't fail the user's request, it
// just means the next identical run pays for RapidAPI again.
export async function setCachedResult(cacheKey: string, result: Judge0Result[]): Promise<void> {
  try {
    await prisma.judge0SubmissionCache.upsert({
      where: { cacheKey },
      update: { result: result as never },
      create: { cacheKey, result: result as never },
    });
  } catch (err) {
    console.error('Judge0 cache write failed:', err instanceof Error ? err.message : err);
  }
}
