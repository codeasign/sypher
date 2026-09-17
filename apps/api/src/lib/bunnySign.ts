import crypto from 'crypto';

// Bunny.net Pull Zone "Token Authentication" URL signing — turns a plain
// public CDN URL into a time-limited one (default 1h) so a video URL a
// viewer copies out of DevTools/network tab stops working shortly after.
// This does NOT stop someone from downloading the file while the link is
// still valid (nothing server-side does, short of proxying every byte) —
// it stops the URL from being screenshotted/shared and working forever
// (user question 2026-09-16: "can user any how see the url" — yes, this
// narrows what that URL is worth once seen).
//
// Requires the matching security key to be configured on the Bunny Pull
// Zone itself (dashboard → Pull Zone → Security → Token Authentication →
// Authentication Key) — set BUNNY_TOKEN_AUTH_KEY here to the same value.
// If that env var is unset, signUrl is a no-op (returns the URL
// unchanged) so nothing breaks before that Bunny-side step is done; it
// does NOT enforce signing on its own.
export function signBunnyUrl(url: string, ttlSeconds = 3600): string {
  // Read at call time, not module load — apps/api's env.ts validates/loads
  // dotenv before routes are registered, but reading fresh here also
  // makes this testable without import-order env-var races.
  const tokenAuthKey = process.env.BUNNY_TOKEN_AUTH_KEY;
  if (!tokenAuthKey) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  // Bunny's exact algorithm: base64(sha256(securityKey + urlPath + expires)),
  // then URL-safe char substitution. Path only — query string excluded.
  const hashable = tokenAuthKey + parsed.pathname + expires;
  const token = crypto
    .createHash('sha256')
    .update(hashable)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  parsed.searchParams.set('token', token);
  parsed.searchParams.set('expires', String(expires));
  return parsed.toString();
}
