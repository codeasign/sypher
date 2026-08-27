import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ManageBlogContent from './ManageBlogContent';
import styles from './manage-blog.module.css';

export default async function ManageBlogPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  // Full set in one request — ManageBlogContent does search + pagination
  // client-side (see its own comment for why).
  const postsRes = await serverApiFetch('/blog/manage/list?limit=1000&offset=0');
  if (!postsRes.ok) {
    return (
      <div className={styles.container}>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const page = await postsRes.json();
  return <ManageBlogContent initialPosts={page.posts} />;
}
