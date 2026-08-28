'use client';

import { useEffect, useState } from 'react';
import { getOverview, type CompanyAdminOverview } from '@/data/companyAdmin';
import styles from './admin.module.css';

export default function CorporateAdminOverviewPage(): React.JSX.Element {
  const [data, setData] = useState<CompanyAdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOverview().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!data) return <p className={styles.loading}>Loading…</p>;

  const stats: [string, string | number][] = [
    ['Employees', data.employeeCount],
    ['Groups', data.groupCount],
    ['Courses in plan', data.ceilingCourseCount],
    ['Sidebar items in plan', data.ceilingNavCount],
    ['Seats', data.seats ?? '—'],
  ];

  return (
    <>
      <h1 className={styles.h1}>{data.companyName}</h1>
      {data.accessUntil && (
        <p className={styles.hint}>
          Sypher access through {new Date(data.accessUntil).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
        </p>
      )}
      <div className={styles.cards}>
        {stats.map(([label, value]) => (
          <div key={label} className={styles.card}>
            <div className={styles.cardNum}>{value}</div>
            <div className={styles.cardLabel}>{label}</div>
          </div>
        ))}
      </div>
      <p className={styles.hint} style={{ marginTop: '1.5rem' }}>
        Use <strong>Groups</strong> to decide which courses and sidebar items each group of employees can
        reach — Sypher sets what&rsquo;s available in your plan; you hand out subsets of it. Use{' '}
        <strong>Employees</strong> to add people (CSV upload) and put them in groups.
      </p>
    </>
  );
}
