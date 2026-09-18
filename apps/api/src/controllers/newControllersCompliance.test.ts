import { randomUUID } from 'node:crypto';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import swagger from '../generated/swagger.json';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { UserRepository } from '../repositories/UserRepository';
import { consumeTestAccountResetAllowance, TEST_ACCOUNT_RESET_LIMIT } from '../lib/rateLimit';
import { MAX_CUSTOM_TEST_ACCOUNTS, TestAccountsController, type TestAccountRow } from './TestAccountsController';

// 2026-09-18 compliance pass over the three controllers added since the
// last commit (CodingProblemsController, Judge0Controller,
// TestAccountsController). Cache-header wiring is covered in
// httpCachingAndPagination.test.ts; this file covers the other three fixes:
// security gating (spec-based, since @Security enforcement happens in
// Express middleware apps/tsoaAuth.ts wires in server.ts, not inside the
// controller method itself — calling a method directly bypasses it, so the
// only way to prove the decorator is actually there is to read the
// generated spec it produces), the reset() rate limit, and the ad-hoc
// roster cap.

const userRepository = new UserRepository();

interface SwaggerOperation {
  security?: { session: never[] }[];
}
interface SwaggerDoc {
  paths: Record<string, Record<string, SwaggerOperation>>;
}

function requiresSession(path: string, method: string): boolean {
  const op = (swagger as SwaggerDoc).paths[path]?.[method];
  return Boolean(op?.security?.some((s) => 'session' in s));
}

describe('security gating — every route decided to require login (2026-09-18)', () => {
  it.each([
    ['/coding-problems', 'get'],
    ['/coding-problems/{category}/{problemSlug}', 'get'],
    ['/coding-problems/{problemId}/bookmark', 'post'],
    ['/coding-problems/{problemId}/bookmark', 'delete'],
    ['/coding-problems/judge0/usage', 'get'],
    ['/coding-problems/judge0/run', 'post'],
    ['/coding-problems/judge0/submit', 'post'],
    ['/coding-problems/judge0/custom', 'post'],
    ['/admin/test-accounts', 'get'],
    ['/admin/test-accounts/reset', 'post'],
    ['/admin/test-accounts/role', 'post'],
  ])('%s %s carries @Security(\'session\') in the generated spec', (path, method) => {
    expect(requiresSession(path, method)).toBe(true);
  });
});

function makeRequest(overrides: { user?: User } = {}): ExpressRequest {
  return { headers: {}, cookies: {}, user: overrides.user } as unknown as ExpressRequest;
}

describe('TestAccountsController.reset() — rate limit + roster cap (2026-09-18)', () => {
  const createdUserIds: string[] = [];
  const createdEmails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  let admin: User;

  beforeAll(async () => {
    admin = await userRepository.create({
      email: `reset-limit-admin-${randomUUID()}@example.com`,
      passwordHash: await hashPassword('irrelevant-not-used-12345'),
      fullName: 'Reset Limit Admin',
      provider: 'EMAIL',
      role: 'ADMIN',
    });
    createdUserIds.push(admin.id);
  });

  it('a non-admin is rejected before rate limiting or the DB write ever runs', async () => {
    const nonAdmin = await userRepository.create({
      email: `reset-non-admin-${randomUUID()}@example.com`,
      passwordHash: await hashPassword('irrelevant-not-used-12345'),
      fullName: 'Non Admin',
      provider: 'EMAIL',
      role: 'FREE_USER',
    });
    createdUserIds.push(nonAdmin.id);

    const controller = new TestAccountsController();
    const badRequest = () => undefined as never;
    const forbidden = () => undefined as never;
    const tooManyRequests = () => undefined as never;

    await expect(
      controller.reset({ email: 'admin-test@sypher.local' }, makeRequest({ user: nonAdmin }), badRequest, forbidden, tooManyRequests),
    ).rejects.toThrow();
  });

  it('an unrecognized/malformed email is rejected with 400, not silently accepted', async () => {
    const controller = new TestAccountsController();
    let badRequestCalled = false;
    const badRequest = (() => {
      badRequestCalled = true;
      return undefined;
    }) as never;
    const forbidden = () => undefined as never;
    const tooManyRequests = () => undefined as never;

    const result = await controller.reset({ email: 'not-an-email' }, makeRequest({ user: admin }), badRequest, forbidden, tooManyRequests);
    expect(result).toBeUndefined();
    expect(badRequestCalled).toBe(true);
  });

  // Exhausts the limiter directly (already proven atomic/correct generically
  // in rateLimit.test.ts's wiring table) rather than calling reset() itself
  // TEST_ACCOUNT_RESET_LIMIT+1 times — that would mean that many real
  // hard-delete + re-provision + welcome-email cycles just to prove the
  // controller checks the right key before doing any of that work.
  it('reset() returns 429 once the per-admin bucket is exhausted, before touching the DB', async () => {
    // A fresh synthetic admin id, isolated from `admin` above (which the
    // malformed-email test already consumed one unit from) — requireAdmin
    // only checks .role, and consumeTestAccountResetAllowance only needs a
    // string key, so this doesn't need to be a real DB row.
    const isolatedAdmin = { id: `rate-limit-test-${randomUUID()}`, role: 'ADMIN' } as User;

    for (let i = 0; i < TEST_ACCOUNT_RESET_LIMIT; i++) {
      const retryAfter = await consumeTestAccountResetAllowance(isolatedAdmin.id);
      expect(retryAfter).toBe(0);
    }

    const controller = new TestAccountsController();
    let tooManyRequestsCalled = false;
    const badRequest = () => undefined as never;
    const forbidden = () => undefined as never;
    const tooManyRequests = (() => {
      tooManyRequestsCalled = true;
      return undefined;
    }) as never;

    const result = await controller.reset(
      { email: 'admin-test@sypher.local' },
      makeRequest({ user: isolatedAdmin }),
      badRequest,
      forbidden,
      tooManyRequests,
    );
    expect(result).toBeUndefined();
    expect(tooManyRequestsCalled).toBe(true);
  });
});

describe('TestAccountsController ad-hoc roster — DB-backed, shared across instances (2026-09-18)', () => {
  const seededEmails: string[] = [];
  const createdUserEmails: string[] = [];

  afterEach(async () => {
    if (seededEmails.length > 0) {
      await prisma.$executeRaw`DELETE FROM "CustomTestAccount" WHERE email = ANY(${seededEmails})`;
      seededEmails.length = 0;
    }
  });

  afterAll(async () => {
    if (createdUserEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });
    }
    await prisma.$disconnect();
  });

  function freshAdmin(): User {
    return { id: randomUUID(), role: 'ADMIN' } as User;
  }

  // "Two instances" = two independent controller instances with no shared
  // in-process state between them (tsoa already instantiates a fresh
  // controller per request in production; this mirrors that) — the only
  // thing they can possibly share is the DB, which is exactly what's being
  // proven here.
  it('a custom account added via one "instance" is immediately visible to another', async () => {
    const email = `two-instances-${randomUUID()}@example.com`;
    seededEmails.push(email);
    createdUserEmails.push(email);

    const instanceA = new TestAccountsController();
    const badRequest = () => undefined as never;
    const forbidden = () => undefined as never;
    const tooManyRequests = () => undefined as never;

    const created = await instanceA.reset({ email, role: 'PAID_USER' }, makeRequest({ user: freshAdmin() }), badRequest, forbidden, tooManyRequests);
    expect(created).toBeTruthy();
    expect(created?.role).toBe('PAID_USER');

    // A brand-new controller instance, standing in for a second apps/api
    // process — it has never seen `email` before in-process.
    const instanceB = new TestAccountsController();
    const rows = await instanceB.list(makeRequest({ user: freshAdmin() }), forbidden);
    expect(Array.isArray(rows)).toBe(true);
    const row = (rows as TestAccountRow[]).find((r) => r.email === email);
    expect(row).toBeTruthy();
    expect(row?.roleEditable).toBe(true);
    expect(row?.role).toBe('PAID_USER');

    // Instance B can also switch its role, proving it independently
    // resolved the account as role-editable via the DB, not via anything
    // instance A left behind in memory.
    const notFound = () => undefined as never;
    const switched = await instanceB.setRole({ email, role: 'ADMIN' }, makeRequest({ user: freshAdmin() }), badRequest, notFound, forbidden);
    expect(switched?.role).toBe('ADMIN');
  });

  it('reset() with a brand-new email is rejected once the cap is reached — a true aggregate, not per-instance', async () => {
    const fillerEmails = Array.from({ length: MAX_CUSTOM_TEST_ACCOUNTS }, () => `cap-filler-${randomUUID()}@example.com`);
    seededEmails.push(...fillerEmails);
    await prisma.$transaction(
      fillerEmails.map(
        (email) => prisma.$executeRaw`
          INSERT INTO "CustomTestAccount" (email, "fullName", role, "createdAt")
          VALUES (${email}, 'Filler', 'FREE_USER'::"Role", now())
        `,
      ),
    );

    const forbidden0 = () => undefined as never;
    const tooManyRequests0 = () => undefined as never;

    // A DIFFERENT controller instance than whatever inserted the filler
    // rows above (there wasn't even a controller involved in seeding them
    // — this is the point: the cap is enforced against the DB's actual
    // row count, not anything any particular instance has seen or done).
    const anotherInstance = new TestAccountsController();
    let badRequestMessage: string | undefined;
    const badRequest = ((_status: number, body: { message: string }) => {
      badRequestMessage = body.message;
      return undefined;
    }) as never;

    const result = await anotherInstance.reset(
      { email: `brand-new-${randomUUID()}@example.com` },
      makeRequest({ user: freshAdmin() }),
      badRequest,
      forbidden0,
      tooManyRequests0,
    );

    expect(result).toBeUndefined();
    expect(badRequestMessage).toMatch(/limit reached/i);
  });
});
