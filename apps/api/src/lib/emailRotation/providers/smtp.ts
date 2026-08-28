import nodemailer from 'nodemailer';
import type { EmailProvider, SendEmailParams, SendEmailResult } from '../types';
import { env } from '../../env';

/**
 * Generic SMTP provider for the email rotation. Selected only when
 * `EMAIL_TRANSPORT=smtp` — the rotation then uses this exclusively, so a
 * GreenMail / Mailpit / MailHog server (a local container OR a shared
 * external one) captures every transactional email for inspection.
 *
 * Config (all `SMTP_*` in env — see .env.example):
 *   host / port          required target
 *   secure               true = TLS on connect (:465); false = plain / STARTTLS
 *   user / pass           optional — omit for a local GreenMail with auth disabled
 *   from                  sender header
 */

const { host, port, secure, user, pass, from } = env.email.smtp;

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  ...(user || pass ? { auth: { user, pass } } : {}),
});

async function send(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    await transport.sendMail({ from, to: params.to, subject: params.subject, html: params.html });
    return { success: true, provider: 'smtp' };
  } catch (err) {
    return { success: false, provider: 'smtp', error: err instanceof Error ? err.message : 'SMTP send failed' };
  }
}

export const smtpProvider: EmailProvider = { name: 'smtp', send };
