import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';

function RequireAuthInner({ children }: { children: ReactNode }): JSX.Element | null {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  if (loading) {
    return <p role="status">Checking your session…</p>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading…</p>}>
      {() => <RequireAuthInner>{children}</RequireAuthInner>}
    </BrowserOnly>
  );
}
