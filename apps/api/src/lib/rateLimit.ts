/**
 * Per-user fixed-window rate limit for comment creation — scoped to this
 * feature only; deliberately NOT the start of platform-wide rate-limiting
 * infra (login/other endpoints remain a separately tracked gap).
 *
 * In-memory by design: apps/api runs as a single Node process, so a
 * process-local counter is authoritative. A rate limit is an abuse
 * throttle, not a correctness guarantee — losing buckets on restart costs
 * a spammer at most one extra window. If the API ever runs multi-instance,
 * move the bucket store to Redis/DB behind this same function signature.
 */

const WINDOW_MS = 60_000;
export const COMMENT_CREATE_LIMIT = 5;

// Grows with unique commenting users; entries expire after one window.
// Swept opportunistically rather than on a timer — no interval to leak.
const SWEEP_THRESHOLD = 5000;

const buckets = new Map<string, { windowStart: number; count: number }>();

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key);
  }
}

/**
 * Records one comment-creation attempt for the user. Returns 0 when
 * allowed, otherwise the seconds until the current window resets (for the
 * 429's Retry-After header).
 */
export function consumeCommentAllowance(userId: string): number {
  return consumeAllowance(`comment:${userId}`, COMMENT_CREATE_LIMIT);
}

// Unauthenticated company-code lookups on the corporate portal — keyed by
// client IP, not user id (there's no session yet at that point). Codes
// aren't secret (ACME-style), so this only blunts brute-force enumeration.
export const COMPANY_RESOLVE_LIMIT = 12;

export function consumeCompanyResolveAllowance(clientKey: string): number {
  return consumeAllowance(`company-resolve:${clientKey}`, COMPANY_RESOLVE_LIMIT);
}

/**
 * Shared fixed-window bucket. `key` is caller-namespaced so unrelated
 * limiters can't collide. Returns 0 when allowed, else seconds until the
 * window resets (for a 429's Retry-After header).
 */
function consumeAllowance(key: string, limit: number): number {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return 0;
  }
  if (bucket.count >= limit) {
    return Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
  }
  bucket.count += 1;
  return 0;
}
