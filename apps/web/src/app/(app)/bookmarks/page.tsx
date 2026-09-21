import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { Course, CourseWithAccess } from '@/data/courses';
import type { AuthoredModuleBookmarkEntry } from '@/data/bookmarks';
import type { CodingProblemSummary } from '@/data/codingProblems';
import BookmarksContent, { type BookmarkedModule } from './BookmarksContent';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Bookmarks',
  description: 'Courses, modules and coding problems you’ve bookmarked on Sypher.',
};

// A bookmarked course that isn't in the per-user catalog list (unpublished,
// or otherwise out of scope) still gets a card — as a no-access Preview.
function asCardCourse(course: Course): CourseWithAccess {
  return { ...course, hasFullAccess: false, started: false, completedModules: 0, totalModules: 0 };
}

export default async function BookmarksPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const [courseIdsRes, moduleBookmarksRes, sidebarRes, problemsRes, problemBookmarksRes] = await Promise.all([
    serverApiFetch('/bookmarks/authored-courses'),
    serverApiFetch('/bookmarks/authored-modules'),
    serverApiFetch('/courses/sidebar-list'),
    serverApiFetch('/coding-problems'),
    serverApiFetch('/coding-problems/bookmarks/mine'),
  ]);
  // Coding problems: bookmarks come back as bare ids, so join them against the
  // full problem list (summaries only) to get titles + categories. Grouping
  // by category happens client-side in the Coding Problems tab.
  const allProblems: CodingProblemSummary[] = problemsRes.ok ? await problemsRes.json() : [];
  const problemBookmarkIds = new Set<string>(problemBookmarksRes.ok ? await problemBookmarksRes.json() : []);
  const bookmarkedProblems = allProblems.filter((p) => problemBookmarkIds.has(p.id));
  const courseIds: string[] = courseIdsRes.ok ? await courseIdsRes.json() : [];
  const moduleBookmarks: AuthoredModuleBookmarkEntry[] = moduleBookmarksRes.ok ? await moduleBookmarksRes.json() : [];
  const sidebarCourses: CourseWithAccess[] = sidebarRes.ok ? await sidebarRes.json() : [];
  const moduleIds = moduleBookmarks.map((b) => b.moduleId);

  const [coursesRes, modulesRes] = await Promise.all([
    courseIds.length > 0
      ? serverApiFetch('/courses/by-ids', { method: 'POST', body: JSON.stringify({ ids: courseIds }) })
      : Promise.resolve(null),
    moduleIds.length > 0
      ? serverApiFetch('/courses/modules/by-ids', { method: 'POST', body: JSON.stringify({ ids: moduleIds }) })
      : Promise.resolve(null),
  ]);
  const baseCourses: Course[] = coursesRes?.ok ? await coursesRes.json() : [];
  const modules: BookmarkedModule[] = modulesRes?.ok ? await modulesRes.json() : [];

  // Prefer the per-user catalog entry (carries access + progress, so the card
  // shows Start / Resume / Preview and a progress bar exactly like My Courses
  // and Browse Courses); fall back to the bare course record. Order follows
  // the bookmark list the API returned.
  const enrichedById = new Map(sidebarCourses.map((c) => [c.id, c]));
  const baseById = new Map(baseCourses.map((c) => [c.id, c]));
  const courses: CourseWithAccess[] = courseIds
    .map((id) => {
      const enriched = enrichedById.get(id);
      if (enriched) return enriched;
      const base = baseById.get(id);
      return base ? asCardCourse(base) : null;
    })
    .filter((c): c is CourseWithAccess => c !== null);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <BookmarksContent initialCourses={courses} initialModules={modules} initialProblems={bookmarkedProblems} />
      </div>
    </div>
  );
}
