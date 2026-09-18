import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { env } from './env';
import { TOUCH_THRESHOLD_MS, isSessionTouchStale, usedBearerAuth } from './tsoaAuth';

// touchIfStale itself isn't exported (it fires the actual DB write), but its
// entire decision is this predicate — proving the threshold here covers the
// behavior without needing to mock SessionRepository.
describe('isSessionTouchStale', () => {
  it('is not stale immediately after being seen', () => {
    expect(isSessionTouchStale(new Date())).toBe(false);
  });

  it('is not stale just under the threshold', () => {
    const lastSeenAt = new Date(Date.now() - (TOUCH_THRESHOLD_MS - 1000));
    expect(isSessionTouchStale(lastSeenAt)).toBe(false);
  });

  it('is stale exactly at the threshold', () => {
    const now = new Date();
    const lastSeenAt = new Date(now.getTime() - TOUCH_THRESHOLD_MS);
    expect(isSessionTouchStale(lastSeenAt, now)).toBe(true);
  });

  it('is stale well past the threshold', () => {
    const lastSeenAt = new Date(Date.now() - TOUCH_THRESHOLD_MS * 10);
    expect(isSessionTouchStale(lastSeenAt)).toBe(true);
  });
});

// videoStream.ts's Referer-check bypass (2026-09-18 mobile-readiness fix)
// depends entirely on this correctly distinguishing the two mechanisms —
// same cookie-wins-if-present precedence as extractSessionToken.
describe('usedBearerAuth', () => {
  function makeRequest(overrides: { headers?: Record<string, string>; cookies?: Record<string, string> } = {}): Request {
    return { headers: overrides.headers ?? {}, cookies: overrides.cookies ?? {} } as unknown as Request;
  }

  it('is true when only an Authorization: Bearer header is present', () => {
    const request = makeRequest({ headers: { authorization: 'Bearer some-token' } });
    expect(usedBearerAuth(request)).toBe(true);
  });

  it('is false when the session cookie is present, even alongside a Bearer header', () => {
    const request = makeRequest({
      cookies: { [env.sessionCookieName]: 'cookie-token' },
      headers: { authorization: 'Bearer some-token' },
    });
    expect(usedBearerAuth(request)).toBe(false);
  });

  it('is false when only the session cookie is present', () => {
    const request = makeRequest({ cookies: { [env.sessionCookieName]: 'cookie-token' } });
    expect(usedBearerAuth(request)).toBe(false);
  });

  it('is false when neither is present', () => {
    expect(usedBearerAuth(makeRequest())).toBe(false);
  });

  it('is false for a malformed Authorization header (not "Bearer ...")', () => {
    const request = makeRequest({ headers: { authorization: 'Basic something' } });
    expect(usedBearerAuth(request)).toBe(false);
  });
});
