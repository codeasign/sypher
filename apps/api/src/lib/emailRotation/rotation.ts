import type { EmailProvider, SendEmailParams, SendEmailResult } from './types';
import { brevoProvider } from './providers/brevo';
import { resendProvider } from './providers/resend';
import { smtpProvider } from './providers/smtp';
import { isUnderQuota, recordEmailSend, type EmailProviderName } from './quota';
import { env } from '../env';

// EMAIL_TRANSPORT=smtp → send everything through the local SMTP provider
// only (a GreenMail/Mailpit container for local email testing); the real
// providers are never contacted. Default / production: Brevo first, then
// Resend. Adding another real provider = one entry here + one providers/*.ts.
const PROVIDERS: EmailProvider[] =
  env.email.transport === 'smtp' ? [smtpProvider] : [brevoProvider, resendProvider];

// Checks quota, picks the first under-quota provider in priority order,
// sends, and records the send only after a confirmed success. A non-quota
// failure (network error, API error, timeout) falls through to the next
// provider instead of failing the whole send.
export async function sendEmailWithRotation(params: SendEmailParams): Promise<SendEmailResult> {
  const attempts: string[] = [];

  for (const provider of PROVIDERS) {
    const name = provider.name as EmailProviderName;

    if (!(await isUnderQuota(name))) {
      attempts.push(`${provider.name}: over quota`);
      continue;
    }

    const result = await provider.send(params);

    if (result.success) {
      await recordEmailSend(name, params.to, params.subject);
      return result;
    }

    attempts.push(`${provider.name}: ${result.error ?? 'unknown error'}`);
  }

  // KNOWN GAP: every provider in the pool is either over quota or failing.
  // Not a near-term concern at current send volume, so this fails loudly
  // rather than queueing or alerting — revisit if volume grows enough that
  // exhausting the whole pool becomes plausible.
  throw new Error(`All email providers failed or are over quota: ${attempts.join('; ')}`);
}
