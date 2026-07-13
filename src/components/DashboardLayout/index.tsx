import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import RequireAuth from '@site/src/components/RequireAuth';
import DashboardSidebar from '@site/src/components/DashboardSidebar';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './styles.module.css';

const SIDEBAR_COLLAPSED_KEY = 'sypher-dashboard-sidebar-collapsed';

interface DashboardLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

function DashboardLayoutContent({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  }, []);

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
  description,
  children,
}: DashboardLayoutProps): JSX.Element {
  return (
    <Layout title={title} description={description} noFooter>
      <RequireAuth>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </RequireAuth>
    </Layout>
  );
}
