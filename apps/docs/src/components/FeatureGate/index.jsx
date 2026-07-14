import React, { useCallback, useEffect, useState } from 'react';
import { getAppOrigin } from '@sypher/auth-core/src/urls';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchFeatureStatus, consumeFeature } from '@site/src/data/featureCredits';
import styles from './styles.module.css';

const FEATURE_CONFIG = {
  resume_review: { path: '/resume-review', label: 'resume review', pluralLabel: 'resume reviews', statusKey: 'resumeReview' },
  mock_interview: { path: '/mock-interview', label: 'mock interview', pluralLabel: 'mock interviews', statusKey: 'mockInterview' },
};

// Gates a career-tools form behind login + allowance/credits. Docs never
// initiates auth or payment itself (see AuthContext.tsx) -- when the
// visitor is anonymous this links to docs' own /login bounce page, and
// when they're logged in but out of allowance it links to the equivalent
// gated page on app.sypher, which already has the full upgrade/buy-credits
// flow (see apps/app/src/app/resume-review|mock-interview/page.tsx).
export default function FeatureGate({ feature, children }) {
  const { supabase, user, role, loading: authLoading } = useAuth();
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    if (!supabase || !user?.id) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    const result = await fetchFeatureStatus(supabase, user.id);
    setStatus(result);
    setStatusLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSuccess = useCallback(async () => {
    if (!supabase || !user?.id) return null;
    const { error } = await consumeFeature(supabase, user.id, feature);
    if (!error) await loadStatus();
    return error;
  }, [supabase, user?.id, feature, loadStatus]);

  const config = FEATURE_CONFIG[feature];

  if (authLoading || (user && statusLoading)) {
    return <p className={styles.statusText}>Checking availability…</p>;
  }

  if (!user) {
    return (
      <div className={styles.ctaCard}>
        <h3 className={styles.ctaTitle}>Log in to submit</h3>
        <p className={styles.ctaText}>
          Log in to your Sypher account to check your {config.label} availability and submit directly.
        </p>
        <a className={styles.ctaBtn} href={`/login?redirect=${encodeURIComponent(config.path)}`}>
          Log In
        </a>
      </div>
    );
  }

  const featureStatus = status?.[config.statusKey];

  if (!featureStatus) {
    return (
      <div className={styles.ctaCard}>
        <p className={styles.ctaText}>Could not load your availability. Please refresh and try again.</p>
      </div>
    );
  }

  const canUse =
    featureStatus.remainingIncluded > 0 ||
    (featureStatus.creditsPerUse > 0 && (status?.creditBalance ?? 0) >= featureStatus.creditsPerUse);

  if (canUse) {
    return children({ onSuccess: handleSuccess });
  }

  const dashboardUrl = `${getAppOrigin()}${config.path}`;

  return (
    <div className={styles.ctaCard}>
      {role === 'free_users' ? (
        <>
          <h3 className={styles.ctaTitle}>Upgrade to unlock {config.pluralLabel}</h3>
          <p className={styles.ctaText}>
            Paid members get {config.pluralLabel} included every year, plus the option to buy more anytime.
          </p>
          <a className={styles.ctaBtn} href={dashboardUrl}>Upgrade to Paid</a>
        </>
      ) : (
        <>
          <h3 className={styles.ctaTitle}>You&apos;re out of {config.pluralLabel}</h3>
          <p className={styles.ctaText}>Buy a credit pack to keep going — credits are valid for 1 year.</p>
          <a className={styles.ctaBtn} href={dashboardUrl}>Buy Credits</a>
        </>
      )}
    </div>
  );
}
