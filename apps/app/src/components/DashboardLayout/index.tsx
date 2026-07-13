'use client';

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import RequireAuth from '@/components/RequireAuth';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import styles from './styles.module.css';

const SIDEBAR_COLLAPSED_KEY = 'sypher-dashboard-sidebar-collapsed';

interface DashboardLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

function DashboardLayoutContent({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  }, []);

  useEffect(() => {
    document.title = title;
  }, [title]);

  function toggleSidebarCollapsed(): void {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className={styles.layout}>
      <DashboardSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
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
