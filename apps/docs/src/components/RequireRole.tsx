import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppOrigin } from '@sypher/auth-core/src/urls';
import type { Role } from '@site/src/types/roles';

interface RequireRoleProps {
  allow: Role[];
  children: ReactNode;
}

function RequireRoleInner({ allow, children }: RequireRoleProps): JSX.Element | null {
  const { role, loading } = useAuth();
  const permitted = role === 'admin' || (role !== null && allow.includes(role));

  useEffect(() => {
    if (!loading && !permitted) {
      window.location.href = `${getAppOrigin()}/dashboard`;
    }
  }, [loading, permitted]);

  if (loading) {
    return <p role="status">Checking access…</p>;
  }

  if (!permitted) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireRole({ allow, children }: RequireRoleProps): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading…</p>}>
      {() => <RequireRoleInner allow={allow}>{children}</RequireRoleInner>}
    </BrowserOnly>
  );
}
