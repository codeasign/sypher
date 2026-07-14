import { AUTH_COOKIE_OPTIONS } from './cookieConfig';

// apps/app is the only place login/logout happens. docs.sypher.local links
// out here instead of calling Supabase directly — derived from the same
// cookie domain so the prod placeholder swaps both at once.
export function getAppOrigin() {
  return `https://app${AUTH_COOKIE_OPTIONS.domain}`;
}

export function getDocsOrigin() {
  return `https://docs${AUTH_COOKIE_OPTIONS.domain}`;
}

export function getAppLoginUrl(redirectTo) {
  const url = new URL('/login', getAppOrigin());
  if (redirectTo) url.searchParams.set('redirect', redirectTo);
  return url.toString();
}

export function getAppSignupUrl(redirectTo) {
  const url = new URL('/signup', getAppOrigin());
  if (redirectTo) url.searchParams.set('redirect', redirectTo);
  return url.toString();
}

export function getAppLogoutUrl() {
  return `${getAppOrigin()}/logout`;
}
