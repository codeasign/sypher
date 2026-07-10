import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';

function RequireAdminInner({ children }: { children: ReactNode }): JSX.Element | null {
  const { role, loading } = useAuth();
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.href = '/dashboard';
    }
  }, [loading, isAdmin]);

  if (loading) {
    return <p role="status">Checking access…</p>;
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireAdmin({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading…</p>}>
      {() => <RequireAdminInner>{children}</RequireAdminInner>}
    </BrowserOnly>
  );
}
