import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from './layout.module.css';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
}

// Route group (app) — covers every page a logged-in user actually
// navigates between (/dashboard, /admin/access, /launch-cohort,
// /manage-cohort-users, /manage-blog). Auth + the sidebar's visible-link
// set are resolved here, once, server-side, before anything reaches the
// browser — individual pages still do their own /auth/me call for their
// own role-specific content/gating (e.g. /admin/access's own denial
// message), which is a small amount of duplicated fetching in exchange for
// not threading user state through the layout/page boundary.
export default async function AppLayout({ children }: { children: ReactNode }): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const user: AuthUser = await meRes.json();
  const isPaidAndActive = user.role === 'PAID_USER' && !!user.paidUntil && new Date(user.paidUntil) > new Date();

  const navRes = await serverApiFetch('/access/my-nav');
  const visibleKeys: string[] = navRes.ok ? await navRes.json() : [];

  return (
    <div className={styles.shell}>
      <DashboardSidebar
        role={user.role}
        email={user.email}
        fullName={user.fullName}
        visibleKeys={visibleKeys}
        isPaidAndActive={isPaidAndActive}
      />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
