import type { EmailProvider, SendEmailParams, SendEmailResult } from '../types';
import { env } from '../../env';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function send(params: SendEmailParams): Promise<SendEmailResult> {
  const { apiKey, senderEmail } = env.email.brevo;
  if (!apiKey || !senderEmail) {
    return { success: false, provider: 'brevo', error: 'BREVO_API_KEY or BREVO_SENDER_EMAIL not configured' };
  }

  let res: Response;
  try {
    res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });
  } catch (err) {
    return { success: false, provider: 'brevo', error: err instanceof Error ? err.message : 'Brevo request failed' };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { success: false, provider: 'brevo', error: `Brevo upstream returned ${res.status}${body ? `: ${body}` : ''}` };
  }

  return { success: true, provider: 'brevo' };
}

export const brevoProvider: EmailProvider = { name: 'brevo', send };
