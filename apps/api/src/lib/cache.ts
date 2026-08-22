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
