import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { Course, CourseModule, CourseWithAccess } from '@/data/courses';
import CourseModuleIndex from '@/components/CourseModuleIndex';
import styles from './layout.module.css';

// Deliberately NOT inside the (app) route group — replaces
// DashboardSidebar with CourseModuleIndex for the whole /learn/[slug]
// subtree (course home + every module page), confirmed with the user
// 2026-08-22: the generic app nav isn't useful while inside a course.
//
// CourseModuleIndex itself is now context-dependent (both the course
// switcher AND the per-course module outline live in one component,
// choosing between them via usePathname()) — confirmed 2026-08-22:
// clicking into an actual module should switch the sidebar from "browse
// other courses" back to "this course's own outline with progress dots,"
// same green-dot tracking already built. Both data sources are fetched
// here and handed down; which one renders is the component's own call.
// The plain course list at /learn (no slug) is unaffected — that route
// stays inside (app), same DashboardSidebar as every other dashboard page.
//
// Own auth check, same small-duplicated-fetch tradeoff (app)/layout.tsx's
// own comment already documents — this layout has no parent auth guard to
// rely on since it isn't nested under (app) anymore.
export default async function CourseLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;

  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const courseRes = await serverApiFetch(`/courses/${encodeURIComponent(slug)}`);
  if (!courseRes.ok) {
    // Course itself is inaccessible/nonexistent — let the page underneath
    // render its own notFound()/redirect rather than duplicating that
    // logic here; just skip the sidebar fetch.
    return <div className={styles.shell}>{children}</div>;
  }
  const course: Course = await courseRes.json();

  // /courses/sidebar-list, not /courses — the sidebar needs locked courses
  // to be discoverable (shown with a lock icon), not hidden the way
  // /learn's own course grid hides fully-inaccessible ones.
  //
  // try/catch, not just res.ok — a transient network failure (e.g. the API
  // process restarting) makes fetch() itself reject, not just return a
  // non-ok response; without this the whole course page (main content
  // included) crashed instead of just rendering with an empty sidebar
  // list. Caught live 2026-08-22 during an API restart.
  let courses: CourseWithAccess[] = [];
  try {
    const coursesRes = await serverApiFetch('/courses/sidebar-list');
    if (coursesRes.ok) courses = await coursesRes.json();
  } catch {
    // leave courses as [] — sidebar still renders with just the current
    // course header, main content is unaffected.
  }

  let modules: CourseModule[] = [];
  try {
    const modulesRes = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules`);
    if (modulesRes.ok) modules = await modulesRes.json();
  } catch {
    // same resilience as the courses fetch above — a transient failure
    // shouldn't crash the page, just leave the module outline empty.
  }

  return (
    <div className={styles.shell}>
      <CourseModuleIndex courseSlug={slug} courseName={course.name} courses={courses} modules={modules} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
