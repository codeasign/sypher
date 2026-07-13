import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getSafeRedirect } from '@site/src/utils/safeRedirect';

function RedirectIfAuthedInner({ children }: { children: ReactNode }): JSX.Element | null {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const target = getSafeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      window.location.href = target;
    }
  }, [loading, user]);

  if (loading || user) {
    return <p role="status">Redirecting…</p>;
  }

  return <>{children}</>;
}

export default function RedirectIfAuthed({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading…</p>}>
      {() => <RedirectIfAuthedInner>{children}</RedirectIfAuthedInner>}
    </BrowserOnly>
  );
}
