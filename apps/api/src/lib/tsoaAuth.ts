import type { Request } from 'express';
import type { User } from '@prisma/client';
import { env } from './env';
import { UnauthorizedError } from './errors';
import { SessionRepository } from '../repositories/SessionRepository';

const sessionRepository = new SessionRepository();

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
 * tsoa's @Security('session') hook. Resolves the request's session token
 * (cookie or bearer — see extractSessionToken), looks up the session row,
 * and resolves to the attached User — tsoa puts this on `request.user` for
 * the controller method to read via @Request(). Single place session
 * validation lives, per the scaffolding plan.
 */
export async function expressAuthentication(request: Request, securityName: string): Promise<User> {
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
