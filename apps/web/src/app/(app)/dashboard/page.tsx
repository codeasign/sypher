import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import { roleLabel } from '@/lib/roleLabels';
import PlanCard from '@/components/PlanCard';
import styles from './styles.module.css';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
}

// Gated management links (Manage Access, Launch Cohort, etc.) now live in
// the (app) route group's shared sidebar (see ../layout.tsx) — driven by
// the same GET /access/my-nav data, so they don't need to be duplicated
// here per-page anymore.
export default async function DashboardPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const user: AuthUser = await meRes.json();
  const isPaidAndActive = user.role === 'PAID_USER' && !!user.paidUntil && new Date(user.paidUntil) > new Date();

  const coursesRes = await serverApiFetch('/access/my-courses');
  const myCourses: string[] = coursesRes.ok ? await coursesRes.json() : [];

  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Logged in as <strong>{user.email}</strong> ({roleLabel(user.role)})
      </p>

      <div className={styles.statsRow}>
        <PlanCard isPaidAndActive={isPaidAndActive} userEmail={user.email} />
      </div>

      <h2>Courses you have access to</h2>
      {myCourses.length === 0 ? <p>No courses granted yet.</p> : <ul>{myCourses.map((slug) => <li key={slug}>{slug}</li>)}</ul>}
    </main>
  );
}
