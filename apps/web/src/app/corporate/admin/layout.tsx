'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { mainAppUrl } from '@/data/corporate';
import styles from './admin.module.css';

interface Me {
  id: string;
  role: string;
  fullName: string | null;
  companyId: string | null;
  mustResetPassword: boolean;
}

const TABS = [
  { href: '/corporate/admin', label: 'Overview' },
  { href: '/corporate/admin/groups', label: 'Groups' },
  { href: '/corporate/admin/employees', label: 'Employees' },
];

// COMPANY_HR-only console. A logged-out visitor is bounced to the code
// screen; a logged-in non-admin is sent to the main app.
export default function CorporateAdminLayout({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (cancelled) return;
        if (!data) {
          router.replace('/corporate');
          return;
        }
        if (data.mustResetPassword) {
          window.location.href = mainAppUrl('/set-password');
          return;
        }
        if (data.role !== 'COMPANY_HR') {
          setState('denied');
          window.location.href = mainAppUrl('/dashboard');
          return;
        }
        setMe(data);
        setState('ok');
      })
      .catch(() => {
        if (!cancelled) router.replace('/corporate');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function signOut(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.replace('/corporate');
  }

  if (state !== 'ok' || !me) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.brandDot} />
          Sypher for Business
        </span>
        <nav className={styles.tabs}>
          {TABS.map((t) => {
            const active = t.href === '/corporate/admin' ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className={styles.signout} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
