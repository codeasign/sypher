import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import LaunchCohortContent from './LaunchCohortContent';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

export default async function LaunchCohortPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) redirect('/login');
  const user: AuthUser = await meRes.json();

  if (user.role !== 'ADMIN') {
    const navRes = await serverApiFetch('/access/my-nav');
    const myNav: string[] = navRes.ok ? await navRes.json() : [];
    if (!myNav.includes('launch-cohort')) {
      return (
        <div style={{ padding: '2rem' }}>
          <h1>Launch Cohort</h1>
          <p>You don&apos;t have access to this page.</p>
        </div>
      );
    }
  }

  return <LaunchCohortContent isAdmin={user.role === 'ADMIN'} />;
}
