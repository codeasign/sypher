import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import TestAccountsContent from './TestAccountsContent';

interface AuthUser {
  role: string;
}

// ADMIN-only, no NavAccess bypass (unlike other Manage pages) — this is
// dev/test tooling that deletes and recreates real DB rows, deliberately
// kept off the DB-driven NavAccess system so it can never be granted to a
// non-admin role by an access-table edit.
export default async function TestAccountsPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) redirect('/login');
  const user: AuthUser = await meRes.json();

  if (user.role !== 'ADMIN') {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Test Accounts</h1>
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return <TestAccountsContent />;
}
