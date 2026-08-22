import { createLogger } from './logger';
import { sendEmailWithRotation } from './emailRotation/rotation';
import { passwordResetEmailHtml, welcomeEmailHtml } from './emailTemplates';

const logger = createLogger('email');

/**
 * Best-effort — a send failure here (every provider over quota or erroring)
 * must never fail the request that triggered it. The reset token already
 * exists once this is called; a delivery failure just means the user won't
 * get the link this time, not that the request itself should error.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  try {
    await sendEmailWithRotation({ to, subject: 'Reset your Sypher password', html: passwordResetEmailHtml(resetLink) });
  } catch (err) {
    logger.error(`Failed to send password reset email to ${to}`, err);
  }
}

/** Same best-effort reasoning as sendPasswordResetEmail — the account already exists by the time this is called. */
export async function sendWelcomeEmail(to: string, fullName: string | null): Promise<void> {
  try {
    await sendEmailWithRotation({ to, subject: 'Welcome to Sypher', html: welcomeEmailHtml(fullName) });
  } catch (err) {
    logger.error(`Failed to send welcome email to ${to}`, err);
  }
}

/**
 * Stub — the user scoped this wiring pass to the register/forgot-password
 * flows specifically; contact-form notification is a fast follow-up if
 * wanted, using the same sendEmailWithRotation call, not touched here.
 */
export async function sendContactNotification(name: string, email: string, message: string): Promise<void> {
  logger.info(`[STUB] Contact form submission from ${name} <${email}>: ${message}`);
}
