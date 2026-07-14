'use client';

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSafeRedirect } from '@/utils/safeRedirect';

export default function RedirectIfAuthed({ children }: { children: ReactNode }): React.JSX.Element | null {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = getSafeRedirect(searchParams.get('redirect'));
    }
  }, [loading, user, searchParams]);

  if (loading || user) {
    return <p role="status">Redirecting…</p>;
  }

  return <>{children}</>;
}
