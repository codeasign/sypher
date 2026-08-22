import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import CoursesCatalog from '@/components/CoursesCatalog';

export const metadata = {
  title: 'All Courses',
  description:
    'Browse all Sypher courses — hands-on, text-first courses in Python, AI engineering, system design, algorithms, and more.',
};

// Recreated natively in apps/web rather than linking out to
// docs.sypher.local/courses (the old Docusaurus page this was ported from).
// Logged-in redirect uses the SSR serverApiFetch('/auth/me') pattern
// already established elsewhere in apps/web — an actual server-side
// redirect, not the old page's client-side "redirect after auth resolves"
// effect, so there's no flash of the catalog before bouncing to /dashboard.
export default async function CoursesPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (meRes.ok) {
    redirect('/dashboard');
  }

  return <CoursesCatalog />;
}
