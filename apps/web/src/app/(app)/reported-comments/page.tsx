import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ReportedCommentsContent from './ReportedCommentsContent';
import styles from '../manage-courses/manage-courses.module.css';

const PAGE_SIZE = 20;

export default async function ReportedCommentsPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const listRes = await serverApiFetch(`/comment-reports?resolved=open&page=1&pageSize=${PAGE_SIZE}`);
  if (!listRes.ok) {
    return (
      <div className={styles.container}>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const initialData = await listRes.json();
  return <ReportedCommentsContent initialData={initialData} pageSize={PAGE_SIZE} />;
}
