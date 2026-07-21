import React from 'react';
import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Runs before hydration (beforeInteractive), before gtag.js has even been
// requested. Sets Google Consent Mode's default to denied unless the
// visitor already made a choice on a previous visit (read from the shared
// cookie -- name must stay in sync with CONSENT_COOKIE_NAME in
// @sypher/auth-core/src/analyticsConsent.js, duplicated here as a literal
// since this has to be plain JS text, not an import). The cookie value is
// JSON ({analytics, marketing} -- see analyticsConsent.js), so a bare
// string match won't work; a pre-categories cookie (plain 'granted'/'denied'
// string) fails JSON.parse and falls through to denied-by-default, same as
// no cookie at all. wait_for_update gives the CookieConsentBanner half a
// second to call gtag('consent','update',...) before GA proceeds.
const CONSENT_DEFAULT_SCRIPT = `
(function() {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var analyticsGranted = false;
  var marketingGranted = false;
  try {
    var match = document.cookie.match(/(?:^|; )sypher-analytics-consent=([^;]*)/);
    if (match) {
      var parsed = JSON.parse(decodeURIComponent(match[1]));
      analyticsGranted = parsed.analytics === 'granted';
      marketingGranted = parsed.marketing === 'granted';
    }
  } catch (e) {}

  gtag('consent', 'default', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    ad_storage: marketingGranted ? 'granted' : 'denied',
    ad_user_data: marketingGranted ? 'granted' : 'denied',
    ad_personalization: marketingGranted ? 'granted' : 'denied',
    wait_for_update: 500,
  });
})();
`;

// No-ops entirely when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset (local dev).
export default function AnalyticsBootstrap(): React.JSX.Element | null {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {CONSENT_DEFAULT_SCRIPT}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {`window.gtag('js', new Date()); window.gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`}
      </Script>
    </>
  );
}
