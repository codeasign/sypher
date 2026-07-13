'use client';

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function RequireAdminInner({ children }: { children: ReactNode }): React.JSX.Element | null {
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

export default function RequireAdmin({ children }: { children: ReactNode }): React.JSX.Element {
  return <RequireAdminInner>{children}</RequireAdminInner>;
}
