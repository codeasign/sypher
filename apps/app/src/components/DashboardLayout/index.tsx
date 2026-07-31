'use client';

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import RequireAuth from '@/components/RequireAuth';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import styles from './styles.module.css';

interface DashboardLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

function DashboardLayoutContent({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  const { user } = useAuth();

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className={styles.layout}>
      <DashboardSidebar user={user} />
      <div className={styles.wrapper}>
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  title,
  children,
}: DashboardLayoutProps): React.JSX.Element {
  return (
    <RequireAuth>
      <DashboardLayoutContent title={title}>{children}</DashboardLayoutContent>
    </RequireAuth>
  );
}
