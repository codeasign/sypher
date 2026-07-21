// Thin wrapper around gtag.js. Every call is a no-op until both (a) gtag has
// loaded (see AnalyticsBootstrap in the root layout) and (b) the visitor has
// granted analytics consent (see CookieConsentBanner) -- Consent Mode
// defaults analytics_storage to 'denied' on every page load, so nothing is
// sent to GA until that default is explicitly updated to 'granted'.

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function gtag(...args: GtagArgs): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  gtag('event', name, params);
}

export function trackPageView(path: string): void {
  gtag('event', 'page_view', { page_path: path });
}

// Called once per session as soon as useAuth() resolves a signed-in user --
// sets GA4's user_id to the Supabase UUID (never email/name) plus the role
// as a user property, so every subsequent event this session is
// segmentable by role without repeating it as an event param.
export function setAnalyticsUser(userId: string | null, role: string | null): void {
  gtag('set', 'user_id', userId ?? undefined);
  gtag('set', 'user_properties', { user_role: role ?? 'signed_out' });
}

export function updateAnalyticsConsent(consent: { analytics: boolean; marketing: boolean }): void {
  gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
}
