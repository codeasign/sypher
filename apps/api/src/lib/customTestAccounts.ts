import type { Role } from '@prisma/client';
import { prisma } from './prisma';

/**
 * DB-backed store for the ad-hoc Test Accounts roster entries added from
 * the "add email" box on /test-accounts (TestAccountsController) —
 * 2026-09-18, replaces a local JSON disk file + in-process Set/Map
 * (testAccountStore.ts, deleted) that only lived on whichever single
 * apps/api instance handled the request. Same shared-table treatment as
 * lib/cache.ts and lib/rateLimit.ts: every instance reads/writes the same
 * "CustomTestAccount" row(s), so an account added via one instance is
 * immediately visible to every other instance's next request, and the
 * roster-size cap (tryInsertCustomTestAccount) is a real aggregate COUNT
 * across the whole table instead of a per-instance counter.
 */

export interface CustomTestAccountRow {
  email: string;
  fullName: string;
  role: Role;
}

export async function listCustomTestAccounts(): Promise<CustomTestAccountRow[]> {
  return prisma.$queryRaw<CustomTestAccountRow[]>`
    SELECT email, "fullName", role FROM "CustomTestAccount" ORDER BY "createdAt" ASC
  `;
}

export async function findCustomTestAccountByEmail(email: string): Promise<CustomTestAccountRow | null> {
  const rows = await prisma.$queryRaw<CustomTestAccountRow[]>`
    SELECT email, "fullName", role FROM "CustomTestAccount" WHERE email = ${email}
  `;
  return rows[0] ?? null;
}

export async function updateCustomTestAccountRole(email: string, role: Role): Promise<void> {
  await prisma.$executeRaw`UPDATE "CustomTestAccount" SET role = ${role}::"Role" WHERE email = ${email}`;
}

// Arbitrary constant, unique to this feature within the app (no other
// pg_advisory_xact_lock call exists in the codebase as of this writing) —
// serializes the count-check-then-insert below across every instance and
// every concurrent request, cluster-wide, not just within one connection.
// Without this, two concurrent inserts on two different instances (or two
// concurrent requests on the same one) could both read COUNT(*) < cap in
// the same instant under READ COMMITTED and both proceed to insert,
// momentarily exceeding the cap by however many raced — the same class of
// bug this whole fix exists to close, just one level up (a roster-size cap
// instead of a single counter), so it gets the same atomicity treatment
// rather than a plain "SELECT COUNT then INSERT" that only looks safe.
const ROSTER_CAP_LOCK_KEY = 729_184_665_301;

export type InsertCustomTestAccountResult = 'created' | 'cap_reached';

/**
 * Atomically inserts a brand-new custom test account, but only if the
 * table is currently under `maxCount` rows — the advisory lock makes the
 * count-check and the insert a single serialized unit across every
 * instance, so `maxCount` is a true aggregate cap, never 50 * N under N
 * instances. `ON CONFLICT DO NOTHING` on email makes a race where two
 * callers try to insert the SAME new email harmless (whichever commits
 * first wins; the second is a no-op, not an error) — the caller
 * (TestAccountsController.reset) already checked for an existing row
 * before calling this, so that race is rare, but not impossible under
 * concurrent requests for the same brand-new email.
 */
export async function tryInsertCustomTestAccount(
  email: string,
  fullName: string,
  role: Role,
  maxCount: number,
): Promise<InsertCustomTestAccountResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ROSTER_CAP_LOCK_KEY})`;

    const [{ count }] = await tx.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "CustomTestAccount"
    `;
    if (Number(count) >= maxCount) return 'cap_reached';

    await tx.$executeRaw`
      INSERT INTO "CustomTestAccount" (email, "fullName", role, "createdAt")
      VALUES (${email}, ${fullName}, ${role}::"Role", now())
      ON CONFLICT (email) DO NOTHING
    `;
    return 'created';
  });
}
