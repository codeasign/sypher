import React, { useEffect, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getStoredConsent, setStoredConsent } from '@sypher/auth-core/src/analyticsConsent';
import { updateAnalyticsConsent } from '@site/src/lib/analytics';
import styles from './styles.module.css';

interface CategoryChoice {
  analytics: boolean;
  marketing: boolean;
}

const ALL_GRANTED: CategoryChoice = { analytics: true, marketing: true };
const ALL_DENIED: CategoryChoice = { analytics: false, marketing: false };

// One consent decision for the whole property -- the cookie is shared with
// app.sypher.local (see analyticsConsent.js), so a choice made here isn't
// re-asked over there and vice versa. Essential cookies (the auth session,
// this consent cookie itself) aren't a real toggle -- they're strictly
// necessary and have no corresponding Consent Mode signal to gate, so
// they're shown as always-on rather than persisted as a choice.
export default function CookieConsentBanner(): React.JSX.Element | null {
  const { siteConfig } = useDocusaurusContext();
  const { gaMeasurementId } = siteConfig.customFields as { gaMeasurementId?: string };
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<CategoryChoice>(ALL_DENIED);

  useEffect(() => {
    if (!gaMeasurementId) return;
    setVisible(getStoredConsent() === null);
  }, [gaMeasurementId]);

  function respond(choice: CategoryChoice): void {
    setStoredConsent({
      analytics: choice.analytics ? 'granted' : 'denied',
      marketing: choice.marketing ? 'granted' : 'denied',
    });
    updateAnalyticsConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie consent" aria-live="polite">
      <p className={styles.text}>
        We use cookies to understand how Sypher is used and improve it. Read our{' '}
        <a href="/privacy-policy" className={styles.link}>
          Privacy Policy
        </a>
        .
      </p>

      {expanded && (
        <div className={styles.categories}>
          <div className={styles.category}>
            <div className={styles.categoryHead}>
              <span className={styles.categoryLabel}>Essential</span>
              <input type="checkbox" checked disabled aria-label="Essential cookies (always on)" />
            </div>
            <p className={styles.categoryText}>
              Required for sign-in and core site functionality. Always on — can't be disabled.
            </p>
          </div>
          <div className={styles.category}>
            <div className={styles.categoryHead}>
              <span className={styles.categoryLabel}>Analytics</span>
              <input
                type="checkbox"
                checked={draft.analytics}
                onChange={(e) => setDraft((prev) => ({ ...prev, analytics: e.target.checked }))}
                aria-label="Analytics cookies"
              />
            </div>
            <p className={styles.categoryText}>
              Helps us understand which pages and features are used, so we know what to improve.
            </p>
          </div>
          <div className={styles.category}>
            <div className={styles.categoryHead}>
              <span className={styles.categoryLabel}>Marketing</span>
              <input
                type="checkbox"
                checked={draft.marketing}
                onChange={(e) => setDraft((prev) => ({ ...prev, marketing: e.target.checked }))}
                aria-label="Marketing cookies"
              />
            </div>
            <p className={styles.categoryText}>
              Used for ad measurement and personalization. We don't currently run ads, but this
              controls whether we'd be allowed to.
            </p>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {expanded ? (
          <button type="button" className={styles.acceptBtn} onClick={() => respond(draft)}>
            Save Preferences
          </button>
        ) : (
          <>
            <button type="button" className={styles.declineBtn} onClick={() => respond(ALL_DENIED)}>
              Reject Non-Essential
            </button>
            <button
              type="button"
              className={styles.customizeBtn}
              onClick={() => {
                const stored = getStoredConsent();
                setDraft(
                  stored
                    ? { analytics: stored.analytics === 'granted', marketing: stored.marketing === 'granted' }
                    : ALL_DENIED
                );
                setExpanded(true);
              }}
            >
              Customize
            </button>
            <button type="button" className={styles.acceptBtn} onClick={() => respond(ALL_GRANTED)}>
              Accept All
            </button>
          </>
        )}
      </div>
    </div>
  );
}
