import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type EmailProviderName = 'brevo' | 'resend';

interface CapConfig {
  envVar: string;
  rpc: 'email_daily_status' | 'email_monthly_status';
}

// Each provider's free-tier caps, independently configurable via env vars --
// verified current numbers (Aug 2026): Brevo 300/day, Resend 100/day AND
// 3,000/month (both caps apply simultaneously, so Resend gets two entries).
// A provider needs only as many entries here as it has distinct reset
// windows -- adding a third provider with, say, a monthly-only cap means
// one entry reusing email_monthly_status, no SQL change required.
const PROVIDER_CAPS: Record<EmailProviderName, CapConfig[]> = {
  brevo: [{ envVar: 'BREVO_DAILY_LIMIT', rpc: 'email_daily_status' }],
  resend: [
    { envVar: 'RESEND_DAILY_LIMIT', rpc: 'email_daily_status' },
    { envVar: 'RESEND_MONTHLY_LIMIT', rpc: 'email_monthly_status' },
  ],
};

export interface PeriodUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function getLimit(envVar: string): number | null {
  const raw = process.env[envVar];
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    // eslint-disable-next-line no-console
    console.error(`${envVar} is unset or invalid -- this cap will not be enforced`);
    return null;
  }
  return n;
}

// Returns null when the cap isn't configured -- callers treat null as
// "fail open, not gated" (same philosophy as judge0MonthlyLimit.ts / rateLimit.ts).
async function getCapStatus(provider: EmailProviderName, cap: CapConfig): Promise<PeriodUsage | null> {
  const limit = getLimit(cap.envVar);
  if (limit === null) return null;

  const { data, error } = await getSupabaseAdmin().rpc(cap.rpc, { p_provider: provider, p_limit: limit });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`${cap.rpc} failed for ${provider}:`, error.message);
    return null;
  }
  return data as PeriodUsage;
}

// A provider is under quota only if EVERY configured cap for it (daily,
// monthly, ...) still has remaining > 0. An unconfigured cap is treated as
// having no ceiling (fail open), not as blocking the provider.
export async function isUnderQuota(provider: EmailProviderName): Promise<boolean> {
  for (const cap of PROVIDER_CAPS[provider]) {
    const status = await getCapStatus(provider, cap);
    if (status && status.remaining <= 0) return false;
  }
  return true;
}

// Read-only status for every configured cap of a provider -- used by the
// admin test endpoint's GET to display usage without duplicating RPC wiring.
export async function getProviderStatus(provider: EmailProviderName): Promise<Record<string, PeriodUsage | null>> {
  const entries = await Promise.all(
    PROVIDER_CAPS[provider].map(async (cap) => [cap.rpc, await getCapStatus(provider, cap)] as const)
  );
  return Object.fromEntries(entries);
}

// Called only after a confirmed successful send (see rotation.ts) -- never
// optimistically before the call. Never throws -- a logging failure here
// shouldn't fail a send that already succeeded.
export async function recordEmailSend(provider: EmailProviderName, to: string, subject: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('email_sends').insert({ provider, to_email: to, subject });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to record email send:', error.message);
  }
}
