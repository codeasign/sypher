import type { EmailProvider, SendEmailParams, SendEmailResult } from '../types';

const RESEND_API_URL = 'https://api.resend.com/emails';

async function send(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    return { success: false, provider: 'resend', error: 'RESEND_API_KEY or RESEND_SENDER_EMAIL not configured' };
  }

  let res: Response;
  try {
    res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
  } catch (err) {
    return { success: false, provider: 'resend', error: err instanceof Error ? err.message : 'Resend request failed' };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { success: false, provider: 'resend', error: `Resend upstream returned ${res.status}${body ? `: ${body}` : ''}` };
  }

  return { success: true, provider: 'resend' };
}

export const resendProvider: EmailProvider = { name: 'resend', send };
