import type { Request } from 'express';
import { prisma } from './prisma';

/**
 * DB-backed fixed-window rate limiting, shared by every limiter in this
 * file via a single "RateLimitBucket" table (see schema.prisma) keyed by a
 * caller-namespaced string (e.g. "login:<email>", "company-resolve:<ip>").
 *
 * Replaces a prior in-process Map: that was only correct for a single
 * apps/api instance (see git history on this file) — under horizontal
 * scaling each instance would keep its own independent counter, so the
 * effective limit multiplied by instance count. The increment-and-check
 * here is one atomic `INSERT ... ON CONFLICT ... RETURNING` (see
 * consumeAllowance), never a read followed by a write, so concurrent
 * requests hitting different instances still serialize on the same DB row
 * and can't race past the limit — same race-safety argument as
 * finalizePayment.ts's atomic UPDATE.
 */

const COMMENT_WINDOW_SECONDS = 60;
export const COMMENT_CREATE_LIMIT = 5;

/**
 * Records one comment-creation attempt for the user. Returns 0 when
 * allowed, otherwise the seconds until the current window resets (for the
 * 429's Retry-After header).
 */
export async function consumeCommentAllowance(userId: string): Promise<number> {
  return consumeAllowance(`comment:${userId}`, COMMENT_CREATE_LIMIT, COMMENT_WINDOW_SECONDS);
}

// Unauthenticated company-code lookups on the corporate portal — keyed by
// client IP, not user id (there's no session yet at that point). Codes
// aren't secret (ACME-style), so this only blunts brute-force enumeration.
const COMPANY_RESOLVE_WINDOW_SECONDS = 60;
export const COMPANY_RESOLVE_LIMIT = 12;

export async function consumeCompanyResolveAllowance(clientKey: string): Promise<number> {
  return consumeAllowance(`company-resolve:${clientKey}`, COMPANY_RESOLVE_LIMIT, COMPANY_RESOLVE_WINDOW_SECONDS);
}

// Password-guessing brake on /auth/login and /auth/login/company. Two
// independent buckets, checked together: one keyed by the attempted email
// (catches sustained guessing against a single account) and one keyed by
// caller IP (catches a spray across many accounts from one source, which
// the email-keyed bucket alone wouldn't limit). Both are incremented on
// every attempt regardless of outcome — a login that turns out to be wrong
// still counts, or the limit would never bind on a real attacker.
const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_IP_LIMIT = 20;

/**
 * Returns 0 when both buckets allow the attempt, otherwise the larger of
 * the two Retry-After values (seconds) — whichever bucket takes longer to
 * reset governs when the caller may retry at all.
 */
export async function consumeLoginAllowance(email: string, ip: string): Promise<number> {
  const [emailRetry, ipRetry] = await Promise.all([
    consumeAllowance(`login:${email}`, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_SECONDS),
    consumeAllowance(`login-ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SECONDS),
  ]);
  return Math.max(emailRetry, ipRetry);
}

// Registration spam brake, keyed by caller IP — a backstop behind recaptcha,
// not the primary defense (recaptcha already blocks most scripted signups).
const REGISTER_WINDOW_SECONDS = 60 * 60;
export const REGISTER_IP_LIMIT = 10;

export async function consumeRegisterAllowance(ip: string): Promise<number> {
  return consumeAllowance(`register-ip:${ip}`, REGISTER_IP_LIMIT, REGISTER_WINDOW_SECONDS);
}

// Abuse backstops on /auth/forgot-password and /auth/reset-password, keyed
// by caller IP. Both endpoints are already enumeration-safe (forgot-password
// always returns the same message; reset-password's token is a 256-bit
// random value, not guessable) — these are generous backstops against
// volume abuse (email-bombing a target's inbox via forgot-password;
// scripted token-guessing traffic against reset-password), not the primary
// defense.
const FORGOT_PASSWORD_WINDOW_SECONDS = 60 * 60;
export const FORGOT_PASSWORD_IP_LIMIT = 20;

export async function consumeForgotPasswordAllowance(ip: string): Promise<number> {
  return consumeAllowance(`forgot-password-ip:${ip}`, FORGOT_PASSWORD_IP_LIMIT, FORGOT_PASSWORD_WINDOW_SECONDS);
}

const RESET_PASSWORD_WINDOW_SECONDS = 60 * 60;
export const RESET_PASSWORD_IP_LIMIT = 20;

export async function consumeResetPasswordAllowance(ip: string): Promise<number> {
  return consumeAllowance(`reset-password-ip:${ip}`, RESET_PASSWORD_IP_LIMIT, RESET_PASSWORD_WINDOW_SECONDS);
}

// Invite/welcome-email fan-out brake on CompanyAdminController's
// employees/import, resend-invite, and invite-link — one shared bucket per
// company, consumed once per call regardless of how many rows a single
// import processes (that volume is bounded separately by
// MAX_IMPORT_ROWS). This protects third-party inboxes from a compromised
// or careless COMPANY_HR account looping these endpoints, not apps/api
// itself — generous on purpose, legitimate onboarding calls these
// endpoints repeatedly over the course of a day.
const COMPANY_INVITE_WINDOW_SECONDS = 60 * 60;
export const COMPANY_INVITE_LIMIT = 50;

export async function consumeCompanyInviteAllowance(companyId: string): Promise<number> {
  return consumeAllowance(`company-invite:${companyId}`, COMPANY_INVITE_LIMIT, COMPANY_INVITE_WINDOW_SECONDS);
}

// Vote/helpful toggle brake, per user — not a primary abuse vector (both
// endpoints just flip a boolean/enum on one row), but a generous backstop
// against a scripted tight loop hammering the DB.
const COMMENT_TOGGLE_WINDOW_SECONDS = 60;
export const COMMENT_TOGGLE_LIMIT = 30;

export async function consumeCommentToggleAllowance(userId: string): Promise<number> {
  return consumeAllowance(`comment-toggle:${userId}`, COMMENT_TOGGLE_LIMIT, COMMENT_TOGGLE_WINDOW_SECONDS);
}

/**
 * Behind Caddy every socket is localhost, so the forwarded client IP is
 * what identifies the real caller; the key only needs to be stable per
 * caller, not perfect. Shared by every IP-keyed limiter.
 */
export function getClientKey(request: Request): string {
  const forwarded = (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return forwarded || request.ip || request.socket.remoteAddress || 'unknown';
}

/**
 * Shared fixed-window bucket, backed by the "RateLimitBucket" table. `key`
 * is caller-namespaced so unrelated limiters can't collide. Returns 0 when
 * allowed, else seconds until the window resets (for a 429's Retry-After
 * header).
 *
 * The window-reset and increment are both computed inside the single
 * INSERT/ON CONFLICT statement (via the CASE expressions), not in
 * application code before or after it — that's what keeps this atomic
 * under concurrent callers for the same key, including callers on
 * different apps/api instances.
 */
export async function consumeAllowance(key: string, limit: number, windowSeconds: number): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "RateLimitBucket" (key, "windowStart", count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - (${windowSeconds} || ' seconds')::interval
          THEN now()
        ELSE "RateLimitBucket"."windowStart"
      END,
      count = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - (${windowSeconds} || ' seconds')::interval
          THEN 1
        ELSE "RateLimitBucket".count + 1
      END
    RETURNING count, "windowStart"
  `;
  const { count, windowStart } = rows[0];
  if (count <= limit) return 0;

  const elapsedMs = Date.now() - windowStart.getTime();
  const remainingMs = windowSeconds * 1000 - elapsedMs;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
