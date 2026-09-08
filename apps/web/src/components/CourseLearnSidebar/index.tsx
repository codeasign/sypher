'use client';

import { usePathname } from 'next/navigation';
import type { CourseModule, CourseWithAccess } from '@/data/courses';
import CourseModuleIndex from '@/components/CourseModuleIndex';
import DashboardSidebar from '@/components/DashboardSidebar';

interface Props {
  courseSlug: string;
  courseName: string;
  courses: CourseWithAccess[];
  modules: CourseModule[];
  role: string;
  email: string;
  fullName: string | null;
  visibleKeys: string[];
  isPaidAndActive: boolean;
}

/** Keep the course home in app navigation while preserving the lesson outline. */
export default function CourseLearnSidebar({
  courseSlug,
  courseName,
  courses,
  modules,
  role,
  email,
  fullName,
  visibleKeys,
  isPaidAndActive,
}: Props): React.JSX.Element {
  const pathname = usePathname();

  if (pathname === `/learn/${courseSlug}`) {
    return <DashboardSidebar role={role} email={email} fullName={fullName} visibleKeys={visibleKeys} isPaidAndActive={isPaidAndActive} />;
  }

  return <CourseModuleIndex courseSlug={courseSlug} courseName={courseName} courses={courses} modules={modules} />;
}
