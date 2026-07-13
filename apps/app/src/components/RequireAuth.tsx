'use client';

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function RequireAuthInner({ children }: { children: ReactNode }): React.JSX.Element | null {
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

export default function RequireAuth({ children }: { children: ReactNode }): React.JSX.Element {
  return <RequireAuthInner>{children}</RequireAuthInner>;
}
