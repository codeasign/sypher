import type { Request } from 'express';
import type { User } from '@prisma/client';
import { env } from './env';
import { UnauthorizedError } from './errors';
import { SessionRepository } from '../repositories/SessionRepository';

const sessionRepository = new SessionRepository();

/**
 * tsoa's @Security('session') hook. Reads the httpOnly session cookie,
 * looks up the session row, and resolves to the attached User — tsoa puts
 * this on `request.user` for the controller method to read via @Request().
 * Single place session-cookie validation lives, per the scaffolding plan.
 */
export async function expressAuthentication(request: Request, securityName: string): Promise<User> {
  if (securityName !== 'session') {
    throw new UnauthorizedError(`Unknown security scheme: ${securityName}`);
  }
  const token = request.cookies?.[env.sessionCookieName];
  if (!token) {
    throw new UnauthorizedError();
  }
  const session = await sessionRepository.findByTokenWithUser(token);
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session expired or invalid');
  }
  await sessionRepository.touch(session.id);
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
  const token = request.cookies?.[env.sessionCookieName];
  if (!token) return null;
  const session = await sessionRepository.findByTokenWithUser(token);
  if (!session || session.expiresAt < new Date()) return null;
  await sessionRepository.touch(session.id);
  return session.user;
}
