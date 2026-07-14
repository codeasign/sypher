// Shared cookie config so a Supabase session set on app.sypher.local is
// readable on docs.sypher.local (and vice versa) — same cookie name, same
// domain, on both apps' createServerClient/createBrowserClient calls.
/** @type {import('@supabase/ssr').CookieOptionsWithName} */
export const AUTH_COOKIE_OPTIONS = {
  domain:
    process.env.NODE_ENV === 'production'
      // TODO: set real production domain before Phase 6 deploy
      ? '.PROD_DOMAIN_TBD'
      : '.sypher.local',
  path: '/',
  sameSite: 'lax',
  secure: true,
};
