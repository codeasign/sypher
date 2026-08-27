import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/serverApi';
import { roleLabel } from '@/lib/roleLabels';
import PlanCard from '@/components/PlanCard';
import type { Course } from '@/data/courses';
import styles from './styles.module.css';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
}

// One earned course completion, as returned by GET /courses/mock-tests —
// the course is embedded so the card renders without a second round-trip.
interface CompletedCourseEntry {
  course: Course;
  completedAt: string;
}

function formatCompletedOn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Gated management links (Manage Access, Launch Cohort, etc.) now live in
// the (app) route group's shared sidebar (see ../layout.tsx) — driven by
// the same GET /access/my-nav data, so they don't need to be duplicated
// here per-page anymore.

// The "Completed courses" section below is the relocated former /mock-tests
// listing (the Mock Test sidebar entry now leads to the exam simulator) —
// moved here so the earned record stays visible, rendered only when
// non-empty.
export default async function DashboardPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const user: AuthUser = await meRes.json();
  const isPaidAndActive = user.role === 'PAID_USER' && !!user.paidUntil && new Date(user.paidUntil) > new Date();

  const coursesRes = await serverApiFetch('/access/my-courses');
  const myCourses: string[] = coursesRes.ok ? await coursesRes.json() : [];

  const completionsRes = await serverApiFetch('/courses/mock-tests');
  const completions: CompletedCourseEntry[] = completionsRes.ok ? await completionsRes.json() : [];

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

      {completions.length > 0 && (
        <>
          <h2 className={styles.completedHeading}>Completed courses</h2>
          <div className={styles.completedGrid}>
            {completions.map(({ course, completedAt }) => (
              <Link key={course.id} href={`/learn/${course.slug}`} className={styles.completedCard}>
                {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.completedImage} />}
                <div className={styles.completedBody}>
                  <span className={styles.completedTitle}>{course.name}</span>
                  {course.description && <span className={styles.completedDescription}>{course.description}</span>}
                  <span className={styles.completedTag}>Completed on {formatCompletedOn(completedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
