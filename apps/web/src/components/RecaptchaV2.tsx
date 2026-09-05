'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import styles from './RecaptchaV2.module.css';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
export const recaptchaConfigured = Boolean(SITE_KEY);

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, parameters: Record<string, unknown>) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

interface RecaptchaV2Props {
  resetSignal?: number;
  onTokenChange: (token: string | null) => void;
}

export default function RecaptchaV2({ resetSignal = 0, onTokenChange }: RecaptchaV2Props): React.JSX.Element | null {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !ready || !window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => onTokenChange(null),
      'error-callback': () => {
        onTokenChange(null);
        setLoadError(true);
      },
    });
  }, [onTokenChange, ready]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null) {
      window.grecaptcha?.reset(widgetIdRef.current);
      onTokenChange(null);
    }
  }, [onTokenChange, resetSignal]);

  if (!SITE_KEY) return null;

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setLoadError(true)}
      />
      <div ref={containerRef} />
      {loadError && <p className={styles.error}>Bot protection could not load. Check your connection and try again.</p>}
    </div>
  );
}
