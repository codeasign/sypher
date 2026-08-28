import { env } from '../env';
import { EmailSendRepository } from '../../repositories/EmailSendRepository';
import { createLogger } from '../logger';

const logger = createLogger('emailQuota');
const emailSendRepository = new EmailSendRepository();

export type EmailProviderName = 'brevo' | 'resend' | 'smtp';

interface CapConfig {
  limit: string;
  periodStart: () => Date;
}

// Each provider's free-tier caps, independently configurable via env vars —
// Brevo 300/day, Resend 100/day AND 3,000/month (both caps apply
// simultaneously, so Resend gets two entries). A provider needs only as
// many entries here as it has distinct reset windows.
function dayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const PROVIDER_CAPS: Record<EmailProviderName, CapConfig[]> = {
  brevo: [{ limit: env.email.brevo.dailyLimit, periodStart: dayStart }],
  resend: [
    { limit: env.email.resend.dailyLimit, periodStart: dayStart },
    { limit: env.email.resend.monthlyLimit, periodStart: monthStart },
  ],
  // Local SMTP sink (GreenMail/Mailpit) — no caps.
  smtp: [],
};

function parseLimit(raw: string): number | null {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// A provider is under quota only if EVERY configured cap for it (daily,
// monthly, ...) still has remaining > 0. An unconfigured cap is treated as
// having no ceiling (fail open), not as blocking the provider — same
// philosophy as judge0MonthlyLimit.ts in the old system.
export async function isUnderQuota(provider: EmailProviderName): Promise<boolean> {
  for (const cap of PROVIDER_CAPS[provider]) {
    const limit = parseLimit(cap.limit);
    if (limit === null) continue;
    const used = await emailSendRepository.countSince(provider, cap.periodStart());
    if (used >= limit) return false;
  }
  return true;
}

// Called only after a confirmed successful send (see rotation.ts) — never
// optimistically before the call. Never throws — a logging failure here
// shouldn't fail a send that already succeeded.
export async function recordEmailSend(provider: EmailProviderName, to: string, subject: string): Promise<void> {
  try {
    await emailSendRepository.record(provider, to, subject);
  } catch (err) {
    logger.error('Failed to record email send', err);
  }
}
