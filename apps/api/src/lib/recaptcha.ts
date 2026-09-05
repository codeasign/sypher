import { env } from './env';

interface RecaptchaVerifyResponse {
  success?: boolean;
}

/**
 * Verify a Google reCAPTCHA v2 response token. Local environments remain
 * usable until RECAPTCHA_REQUIRED=true and a server secret are configured;
 * production defaults to required verification.
 */
export async function verifyRecaptchaToken(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const enabled = env.recaptcha.required || Boolean(env.recaptcha.secretKey);
  if (!enabled) return true;
  if (!env.recaptcha.secretKey || !token) return false;

  const body = new URLSearchParams({ secret: env.recaptcha.secretKey, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as RecaptchaVerifyResponse;
    return result.success === true;
  } catch {
    return false;
  }
}
