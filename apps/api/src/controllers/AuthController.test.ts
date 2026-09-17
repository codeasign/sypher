import { randomUUID } from 'node:crypto';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { hashPassword } from '../lib/password';
import { UnauthorizedError } from '../lib/errors';
import { expressAuthentication } from '../lib/tsoaAuth';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { AuthController } from './AuthController';

// Mobile-Auth-Design.md: bearer-token delivery layered on the existing
// cookie session. These tests exercise the controller/tsoaAuth functions
// directly (same convention as rateLimit.test.ts — real DB, no mocking of
// application code) rather than through a running HTTP server; tsoa's
// @Res() callback params are just plain functions when a controller method
// is called this way, so vi.fn() spies capture exactly what an HTTP
// response would have carried.

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const TEST_PASSWORD = 'correct horse battery staple 42';

function makeRequest(overrides: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  ip?: string;
} = {}): ExpressRequest {
  return {
    headers: overrides.headers ?? {},
    cookies: overrides.cookies ?? {},
    ip: overrides.ip ?? randomUUID(),
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as ExpressRequest;
}

describe('Mobile bearer-token auth (Mobile-Auth-Design.md)', () => {
  const controller = new AuthController();
  const createdUserIds: string[] = [];
  const rateLimitKeys: string[] = [];
  let user: User;

  beforeAll(async () => {
    user = await userRepository.create({
      email: `auth-mobile-test-${randomUUID()}@example.com`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      fullName: 'Mobile Auth Test User',
      provider: 'EMAIL',
    });
    createdUserIds.push(user.id);
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    if (rateLimitKeys.length > 0) {
      await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE key = ANY(${rateLimitKeys})`;
    }
    await prisma.$disconnect();
  });

  describe('token issuance at login/register', () => {
    it('login includes sessionToken in the body when x-sypher-client: mobile is sent', async () => {
      const request = makeRequest({ headers: { 'x-sypher-client': 'mobile' } });
      rateLimitKeys.push(`login:${user.email}`, `login-ip:${request.ip}`);
      const ok = vi.fn();

      await controller.login({ email: user.email, password: TEST_PASSWORD }, request, vi.fn(), vi.fn(), vi.fn(), ok);

      expect(ok).toHaveBeenCalledTimes(1);
      const [status, body, headers] = ok.mock.calls[0];
      expect(status).toBe(200);
      expect(typeof body.sessionToken).toBe('string');
      expect(body.sessionToken.length).toBeGreaterThan(20);
      expect(headers['Set-Cookie']).toContain(`${env.sessionCookieName}=`);

      // The token handed back in the body must be the SAME row the cookie
      // points at — not a decoy — and must resolve to this user.
      const row = await prisma.session.findUnique({ where: { token: body.sessionToken } });
      expect(row?.userId).toBe(user.id);
    });

    it('login omits sessionToken when the mobile header is absent', async () => {
      const request = makeRequest();
      rateLimitKeys.push(`login:${user.email}`, `login-ip:${request.ip}`);
      const ok = vi.fn();

      await controller.login({ email: user.email, password: TEST_PASSWORD }, request, vi.fn(), vi.fn(), vi.fn(), ok);

      expect(ok).toHaveBeenCalledTimes(1);
      const [status, body, headers] = ok.mock.calls[0];
      expect(status).toBe(200);
      expect(body.sessionToken).toBeUndefined();
      // Cookie is unaffected either way — no behavior change for web.
      expect(headers['Set-Cookie']).toContain(`${env.sessionCookieName}=`);
    });

    it('login omits sessionToken when x-sypher-client is present but not "mobile"', async () => {
      const request = makeRequest({ headers: { 'x-sypher-client': 'web' } });
      rateLimitKeys.push(`login:${user.email}`, `login-ip:${request.ip}`);
      const ok = vi.fn();

      await controller.login({ email: user.email, password: TEST_PASSWORD }, request, vi.fn(), vi.fn(), vi.fn(), ok);

      const [, body] = ok.mock.calls[0];
      expect(body.sessionToken).toBeUndefined();
    });

    it('register includes sessionToken only when the mobile header is present', async () => {
      const email = `auth-mobile-register-${randomUUID()}@example.com`;
      const request = makeRequest({ headers: { 'x-sypher-client': 'mobile' } });
      rateLimitKeys.push(`register-ip:${request.ip}`);
      const created = vi.fn();

      await controller.register({ email, password: TEST_PASSWORD, fullName: 'Mobile Signup' }, request, vi.fn(), vi.fn(), vi.fn(), created);

      expect(created).toHaveBeenCalledTimes(1);
      const [status, body, headers] = created.mock.calls[0];
      expect(status).toBe(201);
      createdUserIds.push(body.id);
      expect(typeof body.sessionToken).toBe('string');
      expect(headers['Set-Cookie']).toContain(`${env.sessionCookieName}=`);
    });
  });

  describe('expressAuthentication — bearer token verification', () => {
    it('resolves the user for a valid Authorization: Bearer token', async () => {
      const token = randomUUID();
      await sessionRepository.create({ userId: user.id, token, expiresAt: new Date(Date.now() + 60_000), userAgent: 'mobile-test' });
      const request = makeRequest({ headers: { authorization: `Bearer ${token}` } });

      const resolved = await expressAuthentication(request, 'session');

      expect(resolved.id).toBe(user.id);
    });

    it('rejects an expired bearer token', async () => {
      const token = randomUUID();
      await sessionRepository.create({ userId: user.id, token, expiresAt: new Date(Date.now() - 1000), userAgent: 'mobile-test' });
      const request = makeRequest({ headers: { authorization: `Bearer ${token}` } });

      await expect(expressAuthentication(request, 'session')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects a malformed Authorization header (wrong scheme)', async () => {
      const request = makeRequest({ headers: { authorization: 'Basic dGVzdDp0ZXN0' } });

      await expect(expressAuthentication(request, 'session')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an empty Bearer value', async () => {
      const request = makeRequest({ headers: { authorization: 'Bearer ' } });

      await expect(expressAuthentication(request, 'session')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects a well-formed Bearer token that matches no session', async () => {
      const request = makeRequest({ headers: { authorization: `Bearer ${randomUUID()}` } });

      await expect(expressAuthentication(request, 'session')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects when neither a cookie nor an Authorization header is present', async () => {
      const request = makeRequest();

      await expect(expressAuthentication(request, 'session')).rejects.toThrow(UnauthorizedError);
    });

    it('prefers the cookie over a stray Authorization header when both are present', async () => {
      const cookieToken = randomUUID();
      await sessionRepository.create({ userId: user.id, token: cookieToken, expiresAt: new Date(Date.now() + 60_000), userAgent: 'web-test' });
      const request = makeRequest({
        cookies: { [env.sessionCookieName]: cookieToken },
        headers: { authorization: 'Bearer this-token-does-not-exist' },
      });

      const resolved = await expressAuthentication(request, 'session');

      expect(resolved.id).toBe(user.id);
    });
  });

  describe('logout — bearer-authenticated session', () => {
    it('deletes the session row when authenticated via bearer token instead of cookie', async () => {
      const token = randomUUID();
      await sessionRepository.create({ userId: user.id, token, expiresAt: new Date(Date.now() + 60_000), userAgent: 'mobile-test' });
      const request = makeRequest({ headers: { authorization: `Bearer ${token}` } }); // no cookies at all
      const noContent = vi.fn();

      await controller.logout(request, noContent);

      expect(noContent).toHaveBeenCalledTimes(1);
      const stored = await prisma.session.findUnique({ where: { token } });
      expect(stored).toBeNull();
    });

    it('still clears the cookie header even when the caller authenticated via bearer', async () => {
      const token = randomUUID();
      await sessionRepository.create({ userId: user.id, token, expiresAt: new Date(Date.now() + 60_000), userAgent: 'mobile-test' });
      const request = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      const noContent = vi.fn();

      await controller.logout(request, noContent);

      const [status, , headers] = noContent.mock.calls[0];
      expect(status).toBe(204);
      expect(headers['Set-Cookie']).toContain(`${env.sessionCookieName}=;`);
    });
  });

  describe('deleteAllForUser — revokes sessions regardless of delivery mechanism', () => {
    it('deletes both a cookie-issued and a bearer-issued session for the same user in one call', async () => {
      const cookieToken = randomUUID();
      const bearerToken = randomUUID();
      await sessionRepository.create({ userId: user.id, token: cookieToken, expiresAt: new Date(Date.now() + 60_000), userAgent: 'web-test' });
      await sessionRepository.create({ userId: user.id, token: bearerToken, expiresAt: new Date(Date.now() + 60_000), userAgent: 'mobile-test' });

      await sessionRepository.deleteAllForUser(user.id);

      const remaining = await prisma.session.findMany({ where: { userId: user.id } });
      expect(remaining).toHaveLength(0);
    });
  });
});
