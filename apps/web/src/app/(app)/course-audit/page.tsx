import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { ModuleEditRequest } from '@/data/moduleEditRequests';
import CourseAuditContent from './CourseAuditContent';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Course Audit',
  description: 'Review and approve Reviewer-submitted course content edits before they go live.',
};

export default async function CourseAuditPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const res = await serverApiFetch('/module-edit-requests?status=pending');
  const requests: ModuleEditRequest[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Course Audit</h1>
        <p className={styles.pageSubtitle}>Review Reviewer-submitted content edits — approving makes them live immediately.</p>
      </div>
      <CourseAuditContent initialRequests={requests} />
    </div>
  );
}
