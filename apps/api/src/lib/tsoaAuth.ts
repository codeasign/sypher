import crypto from 'node:crypto';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { env } from './env';
import { UnauthorizedError } from './errors';
import { SessionRepository } from '../repositories/SessionRepository';
import { prisma } from './prisma';

const sessionRepository = new SessionRepository();

/**
 * Constant-time comparison of the X-Import-Tool-Secret header against
 * env.importTool.secret — same shape as the Razorpay webhook signature
 * check (paymentsWebhook.ts): compare lengths first (timingSafeEqual
 * throws on a length mismatch, and comparing length isn't itself a useful
 * timing oracle here), then a real constant-time byte comparison. Not an
 * HMAC — this is a plain shared secret, not a signed payload.
 */
function importToolSecretMatches(request: Request): boolean {
  if (!env.importTool.secret) return false;
  const provided = request.headers['x-import-tool-secret'];
  if (typeof provided !== 'string' || !provided) return false;
  const expected = env.importTool.secret;
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

// touch() updates lastSeenAt on every authenticated request by default,
// which is two DB round trips (the lookup plus this write) on the single
// hottest path in the whole API. lastSeenAt doesn't need per-request
// precision — only refresh it once it's gone stale, and never block the
// request on that write (a lost touch is harmless; it just means
// lastSeenAt is a few minutes further behind than usual).
export const TOUCH_THRESHOLD_MS = 5 * 60 * 1000;

/** Exported for testing — pure so it doesn't need a mocked repository. */
export function isSessionTouchStale(lastSeenAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastSeenAt.getTime() >= TOUCH_THRESHOLD_MS;
}

function touchIfStale(sessionId: string, lastSeenAt: Date): void {
  if (!isSessionTouchStale(lastSeenAt)) return;
  void sessionRepository.touch(sessionId);
}

/**
 * Single source of truth for "where is this request's session token."
 * Checks the httpOnly cookie first — a browser session already logged in
 * takes precedence over any stray Authorization header — then falls back to
 * an `Authorization: Bearer <token>` header for clients with no persistent
 * cookie jar (a native mobile app; see Mobile-Auth-Design.md). Every caller
 * below, including AuthController.logout, picks up bearer-token support
 * automatically without touching its own logic.
 */
export function extractSessionToken(request: Request): string | null {
  const cookieToken = request.cookies?.[env.sessionCookieName];
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
  }
  return null;
}

/**
 * Which mechanism extractSessionToken actually used for this request — same
 * precedence (cookie wins if present, otherwise bearer header), exposed for
 * callers that need to branch on it. Currently just videoStream.ts: a
 * cookie-authenticated request gets the Referer/Origin hotlink check
 * (same-site subresource requests carry cookies automatically, so a
 * mismatched Referer is a real signal); a bearer-authenticated request
 * (Expo/React Native — no cookie jar, and no browser Referer/Origin to
 * check in the first place) skips it, since the bearer token itself is
 * already proof of a legitimate authenticated caller.
 */
export function usedBearerAuth(request: Request): boolean {
  const cookieToken = request.cookies?.[env.sessionCookieName];
  if (cookieToken) return false;
  return Boolean(request.headers.authorization?.startsWith('Bearer '));
}

/**
 * tsoa's @Security('session') hook. Resolves the request's session token
 * (cookie or bearer — see extractSessionToken), looks up the session row,
 * and resolves to the attached User — tsoa puts this on `request.user` for
 * the controller method to read via @Request(). Single place session
 * validation lives, per the scaffolding plan.
 */
export async function expressAuthentication(request: Request, securityName: string): Promise<User> {
  if (securityName === 'importTool') {
    // Deliberately does NOT touch /auth/login|register or their recaptcha
    // gate at all — this resolves a request straight to a real ADMIN User
    // row via a shared-secret header, for scripts/publish-content.ts and
    // the importers it drives. Only endpoints explicitly decorated with
    // @Security('importTool') (stacked alongside @Security('session') —
    // tsoa OR-semantics, either one satisfies) accept this path.
    if (!importToolSecretMatches(request)) {
      throw new UnauthorizedError();
    }
    if (!env.importTool.adminEmail) {
      throw new UnauthorizedError('IMPORT_ADMIN_EMAIL is not configured server-side for the importTool scheme');
    }
    const user = await prisma.user.findUnique({ where: { email: env.importTool.adminEmail } });
    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedError('Configured IMPORT_ADMIN_EMAIL has no matching ADMIN user');
    }
    return user;
  }
  if (securityName !== 'session') {
    throw new UnauthorizedError(`Unknown security scheme: ${securityName}`);
  }
  const token = extractSessionToken(request);
  if (!token) {
    throw new UnauthorizedError();
  }
  const session = await sessionRepository.findByTokenWithUser(token);
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session expired or invalid');
  }
  touchIfStale(session.id, session.lastSeenAt);
  return session.user;
}

/**
 * Same session-cookie lookup as expressAuthentication, but for routes that
 * are readable by anonymous visitors and only need to know WHO is asking
 * when someone happens to be logged in (personalizing viewerVote/
 * viewerHelpful, etc.) — never throws; resolves to null instead of
 * rejecting when there's no cookie or the session is invalid/expired.
 * Routes using this do NOT carry @Security('session') (tsoa's decorator
 * always enforces expressAuthentication's throw-on-missing behavior), so
 * they call this directly instead.
 */
export async function resolveOptionalUser(request: Request): Promise<User | null> {
  const token = extractSessionToken(request);
  if (!token) return null;
  const session = await sessionRepository.findByTokenWithUser(token);
  if (!session || session.expiresAt < new Date()) return null;
  touchIfStale(session.id, session.lastSeenAt);
  return session.user;
}
