import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listCourseAccess, hasCourseAccess } from '@/data/courseAccess';
import { withCourseAccess } from '@sypher/course-catalog/src/homepageCourses';
import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import PillarsSection from '@/components/PillarsSection';
import ApproachSection from '@/components/ApproachSection';
import HomeCourseCatalog from '@/components/HomeCourseCatalog';

export const metadata: Metadata = {
  title: 'Learn AI Engineering & System Design',
  description:
    'Sypher is a hands-on learning platform for AI engineering, system design, Python, and software engineering. Text-first lessons with real projects.',
};

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect('/dashboard');
  }

  const accessRows = await listCourseAccess(supabase);
  const courses = withCourseAccess(hasCourseAccess, null, accessRows, new Set());
  const freeCourses = courses.filter((c: { isFree: boolean }) => c.isFree);
  const premiumCourses = courses.filter((c: { isFree: boolean }) => !c.isFree);

  return (
    <>
      <HeroSection />
      <StatsBar />
      <PillarsSection />
      <div id="courses">
        <HomeCourseCatalog freeCourses={freeCourses} premiumCourses={premiumCourses} />
      </div>
      <ApproachSection />
    </>
  );
}
