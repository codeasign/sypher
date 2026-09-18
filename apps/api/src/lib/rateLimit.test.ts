import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import {
  COMMENT_CREATE_LIMIT,
  COMMENT_TOGGLE_LIMIT,
  COMPANY_INVITE_LIMIT,
  FORGOT_PASSWORD_IP_LIMIT,
  RESET_PASSWORD_IP_LIMIT,
  TEST_ACCOUNT_RESET_LIMIT,
  consumeAllowance,
  consumeCommentAllowance,
  consumeCommentToggleAllowance,
  consumeCompanyInviteAllowance,
  consumeForgotPasswordAllowance,
  consumeResetPasswordAllowance,
  consumeTestAccountResetAllowance,
} from './rateLimit';

// Proves the atomic INSERT ... ON CONFLICT ... RETURNING in consumeAllowance
// actually closes the race it's meant to close: N concurrent callers for the
// SAME key must never let more than `limit` of them through, even though
// they all start from an empty bucket at once. A read-then-write
// implementation (the in-memory Map this replaced, or a naive
// SELECT-then-UPDATE) would let every concurrent caller see count=0 and all
// "win" — this test is what would have caught that bug.
describe('rateLimit concurrent race', () => {
  const keys: string[] = [];

  afterAll(async () => {
    if (keys.length > 0) {
      await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE key = ANY(${keys})`;
    }
    await prisma.$disconnect();
  });

  it('two simultaneous requests against a fresh key never both succeed past a 1-request limit', async () => {
    const key = `test-race-pair-${randomUUID()}`;
    keys.push(key);

    const [a, b] = await Promise.all([consumeAllowance(key, 1, 60), consumeAllowance(key, 1, 60)]);
    const results = [a, b].sort((x, y) => x - y);

    // One caller must win (0 = allowed), the other must be blocked
    // (retryAfter > 0) — never both 0, which would mean both inserts
    // landed as if the other never happened.
    expect(results[0]).toBe(0);
    expect(results[1]).toBeGreaterThan(0);
  });

  it('allows exactly `limit` of many simultaneous requests for the same key, never more', async () => {
    const userId = `test-race-${randomUUID()}`;
    keys.push(`comment:${userId}`);

    const concurrentAttempts = COMMENT_CREATE_LIMIT * 3;
    const results = await Promise.all(
      Array.from({ length: concurrentAttempts }, () => consumeCommentAllowance(userId)),
    );

    const allowed = results.filter((retryAfter) => retryAfter === 0);
    const blocked = results.filter((retryAfter) => retryAfter > 0);

    expect(allowed).toHaveLength(COMMENT_CREATE_LIMIT);
    expect(blocked).toHaveLength(concurrentAttempts - COMMENT_CREATE_LIMIT);
    for (const retryAfter of blocked) {
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    }
  });

  // Each of these wraps consumeAllowance with its own key prefix + limit —
  // the atomicity itself is already proven generically above, so this is
  // wiring verification: the right constant, the right key prefix, called
  // through the real exported function a controller actually calls.
  it.each([
    { label: 'consumeForgotPasswordAllowance', limit: FORGOT_PASSWORD_IP_LIMIT, prefix: 'forgot-password-ip', call: consumeForgotPasswordAllowance },
    { label: 'consumeResetPasswordAllowance', limit: RESET_PASSWORD_IP_LIMIT, prefix: 'reset-password-ip', call: consumeResetPasswordAllowance },
    { label: 'consumeCompanyInviteAllowance', limit: COMPANY_INVITE_LIMIT, prefix: 'company-invite', call: consumeCompanyInviteAllowance },
    { label: 'consumeCommentToggleAllowance', limit: COMMENT_TOGGLE_LIMIT, prefix: 'comment-toggle', call: consumeCommentToggleAllowance },
    { label: 'consumeTestAccountResetAllowance', limit: TEST_ACCOUNT_RESET_LIMIT, prefix: 'test-account-reset', call: consumeTestAccountResetAllowance },
  ])('$label allows exactly its configured limit under concurrency, never more', async ({ limit, prefix, call }) => {
    const id = `test-${randomUUID()}`;
    keys.push(`${prefix}:${id}`);

    const attempts = limit + 5;
    const results = await Promise.all(Array.from({ length: attempts }, () => call(id)));
    const allowed = results.filter((retryAfter) => retryAfter === 0);
    const blocked = results.filter((retryAfter) => retryAfter > 0);

    expect(allowed).toHaveLength(limit);
    expect(blocked).toHaveLength(attempts - limit);
  });
});
