import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import AccessManager from './AccessManager';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

export default async function AdminAccessPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/auth/me');
  if (!res.ok) {
    redirect('/login');
  }
  const user: AuthUser = await res.json();

  if (user.role !== 'ADMIN' && user.role !== 'COMPANY_HR') {
    return (
      <main>
        <h1>Manage access</h1>
        <p>You don&apos;t have access to this page.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Manage access</h1>
      <AccessManager role={user.role} companyId={user.companyId} />
    </main>
  );
}
