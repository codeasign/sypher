// Shared cookie config so a Supabase session set on app.sypher.local is
// readable on docs.sypher.local (and vice versa) — same cookie name, same
// domain, on both apps' createServerClient/createBrowserClient calls.
//
// TODO: once the real production domain is decided (before Phase 6 deploy),
// branch this on it instead of hardcoding '.sypher.local' unconditionally.
// A previous version branched on `process.env.NODE_ENV === 'production'`
// with a '.PROD_DOMAIN_TBD' placeholder for the production case — that
// placeholder leaked into visible URLs (e.g. app.PROD_DOMAIN_TBD/careers)
// whenever a production build (`next build && next start`) ran locally
// against the sypher.local Caddy proxy, since NODE_ENV=production doesn't
// mean "the real prod domain is known." This module is also imported into
// apps/docs's Docusaurus browser bundle, which only reliably inlines
// `process.env.NODE_ENV` (not arbitrary custom env vars) without extra
// webpack wiring, so swap this for a real domain literal rather than an
// env var read.
/** @type {import('@supabase/ssr').CookieOptionsWithName} */
export const AUTH_COOKIE_OPTIONS = {
  domain: '.sypher.local',
  path: '/',
  sameSite: 'lax',
  secure: true,
};
