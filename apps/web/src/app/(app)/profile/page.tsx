import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import { roleLabel } from '@/lib/roleLabels';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

// Placeholder — editable profile fields (name, bio, etc.) pending, same as
// the blank legal pages. Shows real identity data rather than being
// literally empty since that's what "Profile" already means today.
export default async function ProfilePage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const user: AuthUser = await meRes.json();

  return (
    <main>
      <h1>Profile</h1>
      <p>
        <strong>Name:</strong> {user.fullName || '—'}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Role:</strong> {roleLabel(user.role)}
      </p>
    </main>
  );
}
