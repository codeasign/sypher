import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import DashboardHome from '@/components/DashboardHome';
import type { UserDashboard } from '@/data/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your learning progress, streaks, mock-exam scores, and what to pick up next.',
};

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

interface CompletedCourseEntry {
  course: { id: string; slug: string; name: string; description: string | null; coverImageUrl: string | null };
  completedAt: string;
}

// The signed-in user's home: an aggregated snapshot from
// GET /users/me/dashboard (DashboardRepository) rendered as charts + stat
// tiles + a plan-aware CTA band, then course strips. Completed courses (the
// former /mock-tests listing) still ride along as an earned record.
export default async function DashboardPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const user: AuthUser = await meRes.json();

  const [dashRes, completionsRes] = await Promise.all([
    serverApiFetch('/users/me/dashboard'),
    serverApiFetch('/courses/mock-tests'),
  ]);

  if (dashRes.status === 401) {
    redirect('/login');
  }
  const data: UserDashboard = await dashRes.json();
  const completions: CompletedCourseEntry[] = completionsRes.ok ? await completionsRes.json() : [];

  return <DashboardHome data={data} userEmail={user.email} fullName={user.fullName} completions={completions} />;
}
