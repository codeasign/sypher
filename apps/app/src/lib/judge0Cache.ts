import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Judge0Result } from '@/lib/judge0Client';

interface CacheTestCase {
  stdin: string;
  expectedOutput: string;
}

// sourceCode is the already harness-composed string (harness + student code),
// matching what actually gets submitted to Judge0 -- the harness isn't known
// server-side otherwise, since it lives only in the authored .mdx files.
//
// compilerOptions must be included (pass judge0Client.ts's getCompilerOptions(
// languageId) result, not omit it) -- Judge0's actual verdict depends on the
// compiler flags sent alongside the source, so two requests with identical
// language/code/testCases but different flags are NOT the same submission
// and must not collide on the same cache key. `?? ''` gives "no flags" its
// own stable, distinct hash input rather than being indistinguishable from
// "flags not considered at all".
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
  const { data, error } = await getSupabaseAdmin()
    .from('judge0_submission_cache')
    .select('result')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error) {
    console.error('Judge0 cache lookup failed:', error.message);
    return null;
  }
  return (data?.result as Judge0Result[] | undefined) ?? null;
}

// Never throws -- a cache write failure shouldn't fail the user's request,
// it just means the next identical run pays for RapidAPI again.
export async function setCachedResult(cacheKey: string, result: Judge0Result[]): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('judge0_submission_cache')
    .upsert({ cache_key: cacheKey, result });

  if (error) console.error('Judge0 cache write failed:', error.message);
}
