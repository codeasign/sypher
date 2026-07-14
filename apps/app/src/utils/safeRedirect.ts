/**
 * Only allow same-site, path-relative redirect targets. Rejects protocol-relative
 * URLs ("//evil.com") and absolute URLs ("https://evil.com") to prevent an
 * attacker-crafted `?redirect=` param from bouncing a logged-in user off-site.
 *
 * Also rejects `/docs/...` -- that path only exists on docs.sypher.local, never
 * on app. docs.sypher forwards its own relative redirect targets (e.g. from a
 * gated course page) through app's /login and /auth/callback verbatim, so
 * without this check a docs-relative path would resolve against app's own
 * origin here and 404 instead of falling back to /dashboard.
 */
export function getSafeRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return fallback;
  if (target.startsWith('/docs')) return fallback;
  return target;
}
