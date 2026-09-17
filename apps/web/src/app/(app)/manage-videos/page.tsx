import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ManageVideosContent from './ManageVideosContent';
import styles from '../manage-courses/manage-courses.module.css';

export default async function ManageVideosPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const videosRes = await serverApiFetch('/videos/manage/list?limit=1000&offset=0');
  if (!videosRes.ok) {
    return (
      <div className={styles.container}>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const page = await videosRes.json();
  return <ManageVideosContent initialVideos={page.videos} />;
}
