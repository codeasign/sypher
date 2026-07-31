import React from 'react';
import CourseSidebar from '@/components/CourseSidebar';
import styles from './styles.module.css';

interface CourseShellModule {
  id: string;
  slug: string;
  title: string;
}

interface CourseShellProps {
  courseSlug: string;
  courseName: string;
  modules: CourseShellModule[];
  children: React.ReactNode;
}

// Deliberately no access-check logic of its own -- each caller (course-home
// page, module page) already runs its own correct gate (redirect/notFound)
// before ever rendering this, same as before this component existed. A
// Next.js layout.tsx can't do this instead: it has no access to the
// [moduleSlug] segment, so it can't tell a getting-started module (sign-in
// only, Phase 9) apart from a regular one (full course-access-grant check)
// -- see SupabaseSchema.md "Course authoring" / the plan's design note 3.
export default function CourseShell({ courseSlug, courseName, modules, children }: CourseShellProps): React.JSX.Element {
  return (
    <div className={styles.shell}>
      <CourseSidebar courseSlug={courseSlug} courseName={courseName} modules={modules} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
