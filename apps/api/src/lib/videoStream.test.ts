import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import { env } from './env';
import { hashPassword } from './password';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { videoStreamHandler } from './videoStream';

// 2026-09-18 mobile-readiness fix: the Referer/Origin hotlink check must
// only apply to cookie-authenticated (browser) requests, never to
// bearer-authenticated (mobile) ones — a bearer token is already proof of a
// legitimate caller, and an Expo/React Native client has no browser
// Referer/Origin to send in the first place. All three cases below use a
// nonexistent video slug: the point is to prove the request gets PAST the
// auth+Referer gate (a 404 from the DB lookup that follows), not to
// exercise the real Bunny fetch/stream path, which would need network
// access this test shouldn't depend on.

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const TEST_PASSWORD = 'correct horse battery staple 42';

function makeRequest(overrides: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): Request {
  return {
    params: { slug: `no-such-video-${randomUUID()}` },
    headers: overrides.headers ?? {},
    cookies: overrides.cookies ?? {},
    on: () => {},
  } as unknown as Request;
}

function makeResponse() {
  const state = { statusCode: undefined as number | undefined, body: undefined as unknown };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    end() {},
  };
  return { res: res as unknown as import('express').Response, state };
}

describe('videoStreamHandler — Referer check applies only to cookie auth (2026-09-18)', () => {
  const createdUserIds: string[] = [];
  const createdSessionTokens: string[] = [];
  let user: User;

  beforeAll(async () => {
    user = await userRepository.create({
      email: `video-stream-mobile-test-${randomUUID()}@example.com`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      fullName: 'Video Stream Mobile Test User',
      provider: 'EMAIL',
    });
    createdUserIds.push(user.id);
  });

  afterAll(async () => {
    if (createdSessionTokens.length > 0) {
      await prisma.session.deleteMany({ where: { token: { in: createdSessionTokens } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createSessionToken(): Promise<string> {
    const token = randomUUID();
    createdSessionTokens.push(token);
    await sessionRepository.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      userAgent: null,
    });
    return token;
  }

  it('bearer-authenticated request with NO Referer header still reaches the DB lookup (not 403)', async () => {
    const token = await createSessionToken();
    const { res, state } = makeResponse();

    await videoStreamHandler(makeRequest({ headers: { authorization: `Bearer ${token}` } }), res);

    // 404 (nonexistent slug) proves it passed the auth+Referer gate — a
    // 403 here would mean the Referer check wrongly fired for bearer auth.
    expect(state.statusCode).toBe(404);
  });

  it('cookie-authenticated request with NO Referer header still gets 403 — existing protection unchanged', async () => {
    const token = await createSessionToken();
    const { res, state } = makeResponse();

    await videoStreamHandler(makeRequest({ cookies: { [env.sessionCookieName]: token } }), res);

    expect(state.statusCode).toBe(403);
  });

  it('cookie-authenticated request with a WRONG Referer still gets 403 — existing protection unchanged', async () => {
    const token = await createSessionToken();
    const { res, state } = makeResponse();

    await videoStreamHandler(
      makeRequest({ cookies: { [env.sessionCookieName]: token }, headers: { referer: 'https://evil.example.com/' } }),
      res,
    );

    expect(state.statusCode).toBe(403);
  });

  it('cookie-authenticated request with a matching Referer passes the gate (not 403)', async () => {
    const token = await createSessionToken();
    const { res, state } = makeResponse();

    await videoStreamHandler(
      makeRequest({ cookies: { [env.sessionCookieName]: token }, headers: { referer: `${env.corsOrigins[0]}/some-page` } }),
      res,
    );

    expect(state.statusCode).toBe(404);
  });

  it('bearer-authenticated request with NO valid session still gets 401', async () => {
    const { res, state } = makeResponse();

    await videoStreamHandler(makeRequest({ headers: { authorization: 'Bearer not-a-real-token' } }), res);

    expect(state.statusCode).toBe(401);
  });

  it('no auth at all still gets 401', async () => {
    const { res, state } = makeResponse();

    await videoStreamHandler(makeRequest(), res);

    expect(state.statusCode).toBe(401);
  });
});
