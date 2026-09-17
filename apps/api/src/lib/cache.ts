/**
 * Express-side replacement for the old system's Next.js unstable_cache +
 * revalidateTag pattern. That pattern existed because writes happened
 * client-side, directly against Supabase, bypassing the Next.js server
 * entirely — so the server-side cache had no way to know data changed
 * except an explicit revalidate call from the browser after a successful
 * write. Here writes go through this same Express process (the
 * controllers below), so a write can purge synchronously — no
 * cross-process signal needed for that. The purge endpoints
 * (POST /cohorts/revalidate, POST /blog/revalidate) still exist for parity
 * with the old call sites and as a general-purpose invalidation primitive,
 * but the write endpoints don't depend on the frontend remembering to call
 * them — they purge themselves.
 *
 * Single-instance invariant: this store is a plain in-process Map, so it is
 * only correct as long as apps/api runs as a single instance. Confirmed
 * 2026-09-17 — current deployment is single-instance. Under horizontal
 * scaling each instance would hold its own independent cache, so a purge()
 * triggered by a write on one instance would leave the others serving stale
 * data for up to the TTL — the exact bug class rateLimit.ts's
 * consumeAllowance was rewritten to close for rate-limit counters (see that
 * file's comment). If apps/api ever moves to multiple instances, this needs
 * the same treatment: a shared store (e.g. the same Postgres-backed
 * approach) or an invalidation broadcast across instances. Revisit this
 * comment before scaling out rather than debugging stale-cache reports.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export async function getOrSet<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await load();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function purge(prefix: string): void {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      store.delete(key);
    }
  }
}
