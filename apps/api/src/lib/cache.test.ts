import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import { getOrSet, purge } from './cache';

// 2026-09-18: proves the INSERT ... ON CONFLICT ... RETURNING in getOrSet
// actually closes the race it's meant to close — same reasoning as
// rateLimit.test.ts's "concurrent race" suite for consumeAllowance, applied
// to the cache rewrite that replaced the in-process Map.

describe('cache — DB-backed, shared across instances', () => {
  const keys: string[] = [];

  afterAll(async () => {
    if (keys.length > 0) {
      await prisma.$executeRaw`DELETE FROM "CacheEntry" WHERE key = ANY(${keys})`;
    }
    await prisma.$disconnect();
  });

  it('a warm cache never calls load() again', async () => {
    const key = `test-warm-${randomUUID()}`;
    keys.push(key);
    let calls = 0;

    const first = await getOrSet(key, 60_000, async () => {
      calls++;
      return { value: 'first' };
    });
    const second = await getOrSet(key, 60_000, async () => {
      calls++;
      return { value: 'second-should-not-run' };
    });

    expect(first).toEqual({ value: 'first' });
    expect(second).toEqual({ value: 'first' });
    expect(calls).toBe(1);
  });

  it('an expired entry is recomputed, not served stale', async () => {
    const key = `test-expired-${randomUUID()}`;
    keys.push(key);

    await getOrSet(key, -1000, async () => ({ value: 'stale' }));
    const fresh = await getOrSet(key, 60_000, async () => ({ value: 'fresh' }));

    expect(fresh).toEqual({ value: 'fresh' });
  });

  // Simulates two "instances" (concurrent callers, no shared in-process
  // state between them beyond the DB) racing to populate the SAME cold
  // key. Each load() returns a distinguishable, non-deterministic value
  // (a fresh UUID per call) — if the race were handled wrong (e.g. a
  // naive last-write-wins overwrite), the two callers would get back
  // DIFFERENT UUIDs. They must converge on the SAME one: whichever
  // load()'s result reaches Postgres first via the INSERT ... ON CONFLICT
  // ... RETURNING wins, and the loser's RETURNING reflects that same
  // winning row instead of its own computed value.
  it('two instances racing on the same cold key both get the SAME computed value', async () => {
    const key = `test-race-${randomUUID()}`;
    keys.push(key);

    const [a, b] = await Promise.all([
      getOrSet(key, 60_000, async () => ({ instance: 'a', id: randomUUID() })),
      getOrSet(key, 60_000, async () => ({ instance: 'b', id: randomUUID() })),
    ]);

    expect(a).toEqual(b);

    // What's actually stored is the same winning value too — not just what
    // was handed back to the two callers.
    const stored = await getOrSet(key, 60_000, async () => ({ instance: 'c', id: randomUUID() }));
    expect(stored).toEqual(a);
  });

  it('many instances racing on the same cold key all converge on one value', async () => {
    const key = `test-race-many-${randomUUID()}`;
    keys.push(key);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => getOrSet(key, 60_000, async () => ({ instance: i, id: randomUUID() }))),
    );

    const distinctValues = new Set(results.map((r) => JSON.stringify(r)));
    expect(distinctValues.size).toBe(1);
  });

  it('purge() makes the key immediately miss — visible without any TTL wait', async () => {
    const key = `test-purge-${randomUUID()}`;
    keys.push(key);
    let calls = 0;

    await getOrSet(key, 60_000, async () => {
      calls++;
      return { value: 'v1' };
    });
    expect(calls).toBe(1);

    // None of the ~15 real call sites await purge() — they just discard
    // the returned Promise, same as they discarded nothing from the old
    // synchronous-void version. Awaiting it here is only so the test can
    // assert deterministically instead of racing a timer against the
    // DELETE's commit.
    await purge(key);

    const afterPurge = await getOrSet(key, 60_000, async () => {
      calls++;
      return { value: 'v2-recomputed' };
    });

    expect(afterPurge).toEqual({ value: 'v2-recomputed' });
    expect(calls).toBe(2);
  });

  it('purge() with a prefix deletes every "prefix:*" key, not just the exact match', async () => {
    const prefix = `test-prefix-${randomUUID()}`;
    const exact = prefix;
    const child1 = `${prefix}:child1`;
    const child2 = `${prefix}:child2`;
    const unrelated = `${prefix}-not-a-child`;
    keys.push(exact, child1, child2, unrelated);

    await getOrSet(exact, 60_000, async () => ({ v: 'exact' }));
    await getOrSet(child1, 60_000, async () => ({ v: 'child1' }));
    await getOrSet(child2, 60_000, async () => ({ v: 'child2' }));
    await getOrSet(unrelated, 60_000, async () => ({ v: 'unrelated' }));

    await purge(prefix);

    const remaining = await prisma.$queryRaw<{ key: string }[]>`
      SELECT key FROM "CacheEntry" WHERE key = ANY(${[exact, child1, child2, unrelated]})
    `;
    const remainingKeys = remaining.map((r) => r.key).sort();

    expect(remainingKeys).toEqual([unrelated]);
  });
});
