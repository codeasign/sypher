import { createLogger } from './logger';
import { env } from './env';
import { sendEmailWithRotation } from './emailRotation/rotation';
import {
  cohortWelcomeEmailHtml,
  passwordResetEmailHtml,
  setPasswordEmailHtml,
  welcomeEmailHtml,
} from './emailTemplates';

const logger = createLogger('email');

/**
 * Every sender here is BEST-EFFORT and fire-and-forget from the caller's
 * side: a delivery failure (all providers over quota / erroring, or no
 * provider keys configured at all) is caught and logged, never propagated.
 * By the time any of these run, the thing they're notifying about (the
 * account, the reset token, the cohort membership) already exists — the
 * email is a courtesy, not part of the transaction.
 *
 * Wiring reference + how to turn delivery on: Email-Hookup.md (repo root).
 */

async function send(kind: string, to: string, subject: string, html: string): Promise<void> {
  try {
    await sendEmailWithRotation({ to, subject, html });
  } catch (err) {
    logger.error(`Failed to send ${kind} email to ${to}`, err);
  }
}

/** Self-serve signup — the account already has a password. */
export async function sendWelcomeEmail(to: string, fullName: string | null): Promise<void> {
  await send('welcome', to, 'Welcome to Sypher', welcomeEmailHtml(fullName, `${env.frontendUrl}/dashboard`));
}

/**
 * Admin-provisioned / corporate-onboarded account with NO password yet —
 * a combined welcome + set-password link. `orgLabel` is the company name
 * for a corporate employee, or "Sypher" otherwise.
 */
export async function sendSetPasswordEmail(
  to: string,
  fullName: string | null,
  link: string,
  orgLabel = 'Sypher',
): Promise<void> {
  const subject = orgLabel === 'Sypher' ? 'Set your Sypher password' : `Set your password — ${orgLabel} on Sypher`;
  await send('set-password', to, subject, setPasswordEmailHtml(fullName, link, orgLabel));
}

/** Forgot-password flow. */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await send('password-reset', to, 'Reset your Sypher password', passwordResetEmailHtml(resetLink));
}

/** Added to a cohort roster. */
export async function sendCohortWelcomeEmail(
  to: string,
  fullName: string | null,
  cohortTitle: string,
  cohortSlug: string,
): Promise<void> {
  await send(
    'cohort-welcome',
    to,
    `You've been added to ${cohortTitle}`,
    cohortWelcomeEmailHtml(fullName, cohortTitle, `${env.frontendUrl}/cohorts/${cohortSlug}`),
  );
}

/**
 * Stub — contact-form notification was scoped out of the original email
 * wiring pass; wire it with the same `send(...)` helper when wanted.
 */
export async function sendContactNotification(name: string, email: string, message: string): Promise<void> {
  logger.info(`[STUB] Contact form submission from ${name} <${email}>: ${message}`);
}
