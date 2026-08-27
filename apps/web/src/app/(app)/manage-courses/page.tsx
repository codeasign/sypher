import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ManageCoursesContent from './ManageCoursesContent';
import styles from './manage-courses.module.css';

export default async function ManageCoursesPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  // Full set in one request — ManageCoursesContent does search + pagination
  // client-side (see its own comment for why).
  const coursesRes = await serverApiFetch('/courses/manage/list?limit=1000&offset=0');
  if (!coursesRes.ok) {
    return (
      <div className={styles.container}>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const page = await coursesRes.json();
  return <ManageCoursesContent initialCourses={page.courses} />;
}
