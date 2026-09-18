import { prisma } from './prisma';
import { createLogger } from './logger';

/**
 * DB-backed shared cache, backed by the "CacheEntry" table (see
 * schema.prisma) — replaces a prior in-process Map (2026-09-18, same
 * treatment as lib/rateLimit.ts's DB-backed rewrite, see that file's
 * comment for the full precedent). That Map was only correct for a single
 * apps/api instance: under horizontal scaling each instance would hold its
 * own independent cache, so a purge() on one instance would leave every
 * other instance serving stale data for up to the TTL.
 *
 * getOrSet: on a cache miss, two instances can race to compute and write
 * the same cold key. The write is a single INSERT ... ON CONFLICT ...
 * RETURNING (same shape as rateLimit.ts's consumeAllowance) whose CASE
 * keeps the EXISTING row's value when it's still fresh at write time and
 * only falls back to the caller's freshly-computed value when the existing
 * row is missing/stale. That means whichever instance's write reaches
 * Postgres FIRST wins, and RETURNING hands every racing instance back that
 * SAME winning value — no instance ends up caching or returning a
 * different value than another. Honest limitation: this does not prevent
 * both instances from calling `load()` — that would need a distributed
 * lock, which is more machinery than this cache has ever needed. The
 * loser's computed value is simply discarded once RETURNING reports the
 * winner's.
 *
 * purge(): a single DELETE, so it's visible to every instance's next read
 * as soon as the DELETE commits — not batched, not eventually-consistent
 * beyond ordinary Postgres read-your-writes. Returns a Promise (unlike the
 * old Map-backed version, which was synchronous void) but none of the ~15
 * existing call sites need to change: they call `purge('blog')` and
 * discard the return value exactly as before — an unawaited Promise<void>
 * is legal JS, and errors are caught internally here so a transient DB
 * hiccup on an un-awaited call can never become an unhandled rejection.
 * The return value exists so tests (cache.test.ts) can await it
 * deterministically instead of racing a timer.
 */

const logger = createLogger('cache');

interface CacheRow {
  value: unknown;
}

export async function getOrSet<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = new Date();
  const existing = await prisma.$queryRaw<{ value: unknown; expiresAt: Date }[]>`
    SELECT value, "expiresAt" FROM "CacheEntry" WHERE key = ${key}
  `;
  if (existing[0] && existing[0].expiresAt > now) {
    return parseValue<T>(existing[0].value);
  }

  const value = await load();
  const expiresAt = new Date(Date.now() + ttlMs);

  const rows = await prisma.$queryRaw<CacheRow[]>`
    INSERT INTO "CacheEntry" (key, value, "expiresAt")
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${expiresAt})
    ON CONFLICT (key) DO UPDATE SET
      value = CASE
        WHEN "CacheEntry"."expiresAt" > now() THEN "CacheEntry".value
        ELSE EXCLUDED.value
      END,
      "expiresAt" = CASE
        WHEN "CacheEntry"."expiresAt" > now() THEN "CacheEntry"."expiresAt"
        ELSE EXCLUDED."expiresAt"
      END
    RETURNING value
  `;
  return parseValue<T>(rows[0].value);
}

// node-postgres's default type parser already decodes jsonb columns into
// plain JS values for $queryRaw results, but this stays defensive against a
// driver/version change instead of assuming that silently.
function parseValue<T>(raw: unknown): T {
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
}

export async function purge(prefix: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "CacheEntry" WHERE key = ${prefix} OR key LIKE ${`${prefix}:%`}
    `;
  } catch (err) {
    logger.error(`purge(${prefix}) failed`, err);
  }
}
