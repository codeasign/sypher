import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseWithAccess, CourseModule } from '@/data/courses';
import { CourseBookmarkButton } from '@/components/AuthoredBookmarkButton';
import { LockIcon } from '@/components/icons/SidebarIcons';
import CourseHomeTabs from '@/components/CourseHomeTabs';
import DiscussionSection from '@/components/DiscussionSection';
import styles from './styles.module.css';

async function fetchCourse(slug: string): Promise<{ course: CourseWithAccess | null; unauthenticated: boolean }> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}`);
  if (res.status === 401) return { course: null, unauthenticated: true };
  if (!res.ok) return { course: null, unauthenticated: false };
  return { course: await res.json(), unauthenticated: false };
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

  const modulesRes = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules`);
  const modules: CourseModule[] = modulesRes.ok ? await modulesRes.json() : [];

  const bookmarksRes = await serverApiFetch('/bookmarks/authored-courses');
  const bookmarkedIds: string[] = bookmarksRes.ok ? await bookmarksRes.json() : [];

  // relatedCourses is a CSV of slugs; resolve each to its published course
  // so the About tab can link by name. Missing/unpublished slugs are skipped.
  const relatedSlugs = (course.relatedCourses ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const relatedCourses = (
    await Promise.all(
      relatedSlugs.map(async (relatedSlug) => {
        const res = await serverApiFetch(`/courses/${encodeURIComponent(relatedSlug)}`);
        if (!res.ok) return null;
        const related = await res.json();
        return related?.status === 'published' && related.slug !== course.slug
          ? { slug: related.slug as string, name: related.name as string }
          : null;
      }),
    )
  ).filter((c): c is { slug: string; name: string } => c !== null);

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
