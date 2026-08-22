import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ManageBlogContent from './ManageBlogContent';
import styles from './manage-blog.module.css';

export default async function ManageBlogPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const postsRes = await serverApiFetch('/blog/manage/list');
  if (!postsRes.ok) {
    return (
      <div className={styles.container}>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const initialPosts = await postsRes.json();
  return <ManageBlogContent initialPosts={initialPosts} />;
}
