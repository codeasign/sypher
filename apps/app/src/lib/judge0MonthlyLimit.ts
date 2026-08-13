import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Mirrors the canonical "is paid and active" check at
// app/dashboard/page.tsx:92 -- re-derived server-side, never trusted from
// the client (paid_until, not just role, since a demoted-but-stale row
// must not still enforce/display a quota).
export async function isPaidAndActive(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('role, paid_until')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'paid_users' && !!data.paid_until && new Date(data.paid_until) > new Date();
}

function getMonthlyLimit(): number | null {
  const raw = process.env.JUDGE0_MONTHLY_LIMIT_PAID;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    // eslint-disable-next-line no-console
    console.error('JUDGE0_MONTHLY_LIMIT_PAID is unset or invalid -- monthly limit not enforced');
    return null;
  }
  return n;
}

export interface MonthlyUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

// Returns null when the limit isn't configured -- callers treat null as
// "fail open, not gated" (same philosophy as rateLimit.ts).
export async function getMonthlyStatus(userId: string): Promise<MonthlyUsage | null> {
  const limit = getMonthlyLimit();
  if (limit === null) return null;

  const { data, error } = await getSupabaseAdmin().rpc('judge0_monthly_status', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('judge0_monthly_status failed:', error.message);
    return null;
  }
  return data as MonthlyUsage;
}

// Called only after a real Judge0 verdict is confirmed (see batch/route.ts
// and custom/route.ts) -- never before the call, never for an infra-failure
// result. Never throws -- a logging failure here shouldn't fail the user's
// already-completed request.
export async function recordMonthlySubmission(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('judge0_monthly_submissions').insert({ user_id: userId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to record monthly submission:', error.message);
  }
}
