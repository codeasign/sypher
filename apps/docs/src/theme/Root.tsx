import React from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { AuthProvider } from '@site/src/contexts/AuthContext';
import AnalyticsSession from '@site/src/components/AnalyticsSession';
import CookieConsentBanner from '@site/src/components/CookieConsentBanner';

export default function Root({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthProvider>
      <BrowserOnly>{() => <AnalyticsSession />}</BrowserOnly>
      {children}
      <BrowserOnly>{() => <CookieConsentBanner />}</BrowserOnly>
    </AuthProvider>
  );
}
