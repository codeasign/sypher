'use client';

import Link from 'next/link';
import { usePaginatedListView } from '@/hooks/usePaginatedListView';
import { ListViewToolbar } from '@/components/ListViewToolbar';
import Pagination from '@/components/Pagination';
import { AUDIENCE_ROLES, courseActionLabel, fetchBrowseCoursesPage, fetchMyCoursesPage, type CourseWithAccess } from '@/data/courses';
import { CourseBookmarkButton } from '@/components/AuthoredBookmarkButton';
import styles from './styles.module.css';

function roleLabel(value: string): string {
  return AUDIENCE_ROLES.find((r) => r.value === value)?.label ?? value;
}

// Shared by My Courses (/learn) and Browse Courses (/courses) — same card
// shape, same Card/List toggle + "Show more" pagination pattern as
// BlogList/MockExamList, plus the Enroll/Resume/Preview action button
// (courseActionLabel, data/courses.ts). The two pages differ only in
// `source` (which endpoint feeds pagination — My Courses is already
// full-access-only server-side, so its cards never show "Preview") and in
// emptyText. `source` + `role` (not a function) so this stays passable
// from a Server Component — a function prop isn't serializable across the
// server/client boundary (this broke the first version of this component).
export default function CourseListView({
  initialCourses,
  total,
  pageSize,
  source,
  role,
  storageKey,
  bookmarkedIds,
  emptyText,
}: {
  initialCourses: CourseWithAccess[];
  total: number;
  pageSize: number;
  source: 'my-courses' | 'browse';
  role?: string;
  storageKey: string;
  bookmarkedIds: string[];
  emptyText: string;
}) {
  const { items, total: liveTotal, page, totalPages, loading, loadError, goToPage, viewMode, setViewMode } = usePaginatedListView({
    initialItems: initialCourses,
    total,
    pageSize,
    storageKey,
    defaultView: 'card',
    fetchPage: async (limit, offset) => {
      const page =
        source === 'my-courses' ? await fetchMyCoursesPage(limit, offset, role) : await fetchBrowseCoursesPage(limit, offset, role);
      return { items: page.courses, total: page.total };
    },
  });

  if (liveTotal === 0) {
    return <p className={styles.emptyText}>{emptyText}</p>;
  }

  return (
    <>
      <ListViewToolbar
        shown={items.length}
        total={liveTotal}
        itemLabelSingular="course"
        itemLabelPlural="courses"
        viewMode={viewMode}
        onChangeView={setViewMode}
        ariaLabel="Course display"
      />

      {viewMode === 'card' ? (
        <div className={styles.grid}>
          {items.map((course) => (
            <div key={course.id} className={styles.cardWrapper}>
              <Link href={`/learn/${course.slug}`} className={styles.card}>
                {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.cardImage} />}
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{course.name}</h2>
                  {course.description && <p className={styles.cardDescription}>{course.description}</p>}
                  <div className={styles.cardTags}>
                    {course.audienceRole && <span className={styles.roleTag}>{roleLabel(course.audienceRole)}</span>}
                    <span className={`${styles.actionTag} ${!course.hasFullAccess ? styles.actionTagPreview : ''}`}>
                      {courseActionLabel(course)}
                    </span>
                  </div>
                </div>
              </Link>
              <div className={styles.bookmarkSlot}>
                <CourseBookmarkButton courseId={course.id} initialBookmarked={bookmarkedIds.includes(course.id)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.rowList}>
          {items.map((course) => (
            <div key={course.id} className={styles.rowWrapper}>
              <Link href={`/learn/${course.slug}`} className={styles.row}>
                <div className={styles.rowBody}>
                  <div className={styles.rowTop}>
                    <h2 className={styles.rowTitle}>{course.name}</h2>
                    {course.audienceRole && <span className={styles.roleTag}>{roleLabel(course.audienceRole)}</span>}
                  </div>
                  {course.description && <p className={styles.cardDescription}>{course.description}</p>}
                </div>
                <span className={`${styles.actionTag} ${!course.hasFullAccess ? styles.actionTagPreview : ''}`}>
                  {courseActionLabel(course)}
                </span>
              </Link>
              <div className={styles.rowBookmarkSlot}>
                <CourseBookmarkButton courseId={course.id} initialBookmarked={bookmarkedIds.includes(course.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {loadError && <p className={styles.emptyText}>{loadError}</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />
    </>
  );
}
