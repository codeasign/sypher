import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseWithAccess, CourseModuleSummary } from '@/data/courses';
import { CourseBookmarkButton } from '@/components/AuthoredBookmarkButton';
import { LockIcon } from '@/components/icons/SidebarIcons';
import CourseHomeTabs from '@/components/CourseHomeTabs';
import DiscussionSection from '@/components/DiscussionSection';
import styles from './styles.module.css';

async function fetchCourse(slug: string): Promise<{ course: CourseWithAccess | null; unauthenticated: boolean }> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}`);
  if (res.status === 401) return { course: null, unauthenticated: true };
  if (res.status === 404) return { course: null, unauthenticated: false };
  if (!res.ok) throw new Error(`Could not load course (${res.status})`);
  return { course: await res.json(), unauthenticated: false };
}

async function fetchCourseModules(slug: string): Promise<CourseModuleSummary[]> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules`);
  if (!res.ok) throw new Error(`Could not load course topics (${res.status})`);
  return res.json();
}

async function fetchCourseBookmarks(): Promise<string[]> {
  const res = await serverApiFetch('/bookmarks/authored-courses');
  if (!res.ok) throw new Error(`Could not load course bookmarks (${res.status})`);
  return res.json();
}

async function fetchRelatedCourses(course: CourseWithAccess): Promise<Array<{ slug: string; name: string }>> {
  const relatedSlugs = (course.relatedCourses ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  const courses = await Promise.all(
    relatedSlugs.map(async (relatedSlug) => {
      const res = await serverApiFetch(`/courses/${encodeURIComponent(relatedSlug)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Could not load related course (${res.status})`);
      const related = (await res.json()) as CourseWithAccess;
      return related.status === 'published' && related.slug !== course.slug
        ? { slug: related.slug, name: related.name }
        : null;
    }),
  );

  return courses.filter((related): related is { slug: string; name: string } => related !== null);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { course } = await fetchCourse(slug);
  if (!course) return {};
  return { title: course.name, description: course.description ?? undefined };
}

export default async function CourseHomePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const { course, unauthenticated } = await fetchCourse(slug);
  if (unauthenticated) redirect('/login');
  if (!course) notFound();

  // These reads are independent once the course metadata has supplied the
  // related slugs, so start all of them before waiting for any one response.
  const [modules, bookmarkedIds, relatedCourses] = await Promise.all([
    fetchCourseModules(slug),
    fetchCourseBookmarks(),
    fetchRelatedCourses(course),
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/learn" className={styles.backLink}>
          ← My Courses
        </Link>

        {course.category && <span className={styles.categoryBadge}>{course.category}</span>}
        {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.coverImage} />}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{course.name}</h1>
          <CourseBookmarkButton courseId={course.id} initialBookmarked={bookmarkedIds.includes(course.id)} />
        </div>
        <CourseHomeTabs
          about={
            <>
              {course.description ? (
                <p className={styles.description}>{course.description}</p>
              ) : (
                <p className={styles.emptyText}>No description yet.</p>
              )}
              {relatedCourses.length > 0 && (
                <>
                  <h2 className={styles.relatedHeading}>Related courses</h2>
                  <ul className={styles.relatedList}>
                    {relatedCourses.map((related) => (
                      <li key={related.slug}>
                        <Link href={`/learn/${related.slug}`} className={styles.relatedLink}>
                          {related.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          }
          topics={
            <>
              {!course.hasFullAccess && (
                <p className={styles.limitedBanner}>
                  You have preview access to this course — a free selection of modules is unlocked below. Upgrade for full access.
                </p>
              )}

              {modules.length === 0 ? (
                <p className={styles.emptyText}>No modules published yet.</p>
              ) : (
                <ul className={styles.moduleList}>
                  {modules.map((mod, index) => (
                    <li key={mod.id}>
                      <Link
                        href={`/learn/${slug}/${mod.slug}`}
                        className={mod.locked ? `${styles.moduleLink} ${styles.moduleLinkLocked}` : styles.moduleLink}
                      >
                        <span className={styles.moduleIndex}>{index + 1}</span>
                        <span className={styles.moduleTitle}>{mod.title}</span>
                        {mod.locked ? (
                          <LockIcon className={styles.moduleLockIcon} />
                        ) : (
                          !course.hasFullAccess && <span className={styles.freeBadge}>Free</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          }
          discussion={<DiscussionSection targetType="course" targetId={course.id} badgeLabel="Instructor" />}
        />
      </div>
    </div>
  );
}
