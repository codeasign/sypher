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
