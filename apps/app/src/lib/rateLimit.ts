import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Backed by the public.rate_limit_buckets table + rate_limit_check() RPC
// (see supabase-rate-limit-setup.sql) rather than in-memory state -- this
// runs as a Vercel serverless function, where each invocation can land on a
// fresh instance with no shared memory, so an in-memory counter never
// actually enforces a limit in production. The RPC does an atomic
// insert-on-conflict increment-and-check in Postgres, so concurrent
// requests for the same key can't race past the cap.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc('rate_limit_check', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Rate limit check failed:', error.message);
    return true; // fail open -- a broken limiter shouldn't take the route down
  }

  return data === true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
