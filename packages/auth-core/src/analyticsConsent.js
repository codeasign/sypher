import { AUTH_COOKIE_OPTIONS } from './cookieConfig';

// Shared analytics-consent cookie, same domain as the auth session cookie
// (AUTH_COOKIE_OPTIONS) so a choice made on one subdomain (app.sypher.local
// or docs.sypher.local) is respected on the other -- one consent decision
// for the whole property, not one per subdomain.
export const CONSENT_COOKIE_NAME = 'sypher-analytics-consent';
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

// 'essential' isn't stored -- those cookies (auth session, this consent
// cookie itself) are strictly necessary and never gated behind a choice, so
// there's nothing to persist for that category. Only the categories that
// actually have a corresponding gtag Consent Mode signal live here.

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `domain=${AUTH_COOKIE_OPTIONS.domain}`,
    `path=${AUTH_COOKIE_OPTIONS.path}`,
    `max-age=${maxAgeSeconds}`,
    `samesite=${AUTH_COOKIE_OPTIONS.sameSite}`,
  ];
  if (AUTH_COOKIE_OPTIONS.secure) parts.push('secure');
  document.cookie = parts.join('; ');
}

/**
 * @typedef {Object} ConsentChoice
 * @property {'granted'|'denied'} analytics
 * @property {'granted'|'denied'} marketing
 */

/** @returns {ConsentChoice | null} null means no choice made yet (including
 * a pre-categories cookie from before this shape existed -- that's treated
 * as no choice so the banner asks again under the new categories). */
export function getStoredConsent() {
  const raw = readCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.analytics !== 'granted' && parsed.analytics !== 'denied') return null;
    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing === 'granted' ? 'granted' : 'denied',
    };
  } catch {
    return null;
  }
}

/** @param {ConsentChoice} choice */
export function setStoredConsent(choice) {
  writeCookie(CONSENT_COOKIE_NAME, JSON.stringify(choice), CONSENT_MAX_AGE_SECONDS);
}

export function clearStoredConsent() {
  writeCookie(CONSENT_COOKIE_NAME, '', 0);
}
