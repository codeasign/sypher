/**
 * Only allow same-site, path-relative redirect targets. Rejects protocol-relative
 * URLs ("//evil.com") and absolute URLs ("https://evil.com") to prevent an
 * attacker-crafted `?redirect=` param from bouncing a logged-in user off-site.
 */
export function getSafeRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return fallback;
  return target;
}
