'use client';

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNavItemAllowedRoles } from '@/data/navAccess';

interface RequireNavAccessProps {
  itemKey: string;
  children: ReactNode;
}

function RequireNavAccessInner({ itemKey, children }: RequireNavAccessProps): React.JSX.Element | null {
  const { supabase, role, loading: authLoading } = useAuth();
  const [allowedRoles, setAllowedRoles] = useState<string[] | null>(null);

  useEffect(() => {
    if (role === 'admin') {
      setAllowedRoles([]);
      return;
    }
    getNavItemAllowedRoles(supabase, itemKey).then(setAllowedRoles);
  }, [supabase, itemKey, role]);

  const loading = authLoading || allowedRoles === null;
  const permitted = role === 'admin' || (role !== null && (allowedRoles ?? []).includes(role));

  useEffect(() => {
    if (!loading && !permitted) {
      window.location.href = '/dashboard';
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

export default function RequireNavAccess({ itemKey, children }: RequireNavAccessProps): React.JSX.Element {
  return <RequireNavAccessInner itemKey={itemKey}>{children}</RequireNavAccessInner>;
}
