import { env } from './env';
import { createLogger } from './logger';

const logger = createLogger('recaptcha');

interface RecaptchaVerifyResponse {
  success?: boolean;
}

let warnedAboutMobileBypass = false;

/**
 * DEV ONLY: true when RECAPTCHA_MOBILE_DEV_BYPASS is on (never in production)
 * and the caller identifies as the native app via `x-sypher-client: mobile`.
 * That header is trivially spoofable, so this must never become the production
 * path — production mobile sign-in needs app attestation (Apple App Attest /
 * Google Play Integrity), tracked as a known gap in the mobile repo's spec.
 */
export function isMobileRecaptchaDevBypass(request: { headers: Record<string, string | string[] | undefined> }): boolean {
  if (!env.recaptcha.mobileDevBypass) return false;
  if (request.headers['x-sypher-client'] !== 'mobile') return false;
  if (!warnedAboutMobileBypass) {
    warnedAboutMobileBypass = true;
    logger.warn('RECAPTCHA_MOBILE_DEV_BYPASS is active: skipping bot verification for x-sypher-client: mobile (dev only)');
  }
  return true;
}

/**
 * Verify a Google reCAPTCHA v2 response token. Local environments remain
 * usable until RECAPTCHA_REQUIRED=true and a server secret are configured;
 * production defaults to required verification.
 */
export async function verifyRecaptchaToken(token: string | null | undefined, remoteIp?: string): Promise<boolean> {
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
