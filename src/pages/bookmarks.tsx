import React, { useEffect, useMemo, useState } from 'react';
import Link from '@docusaurus/Link';
import DashboardLayout from '@site/src/components/DashboardLayout';
import { CourseGrid } from '@site/src/components/CourseCard';
import ConfirmDialog from '@site/src/components/ConfirmDialog';
import { useBookmarks } from '@site/src/hooks/useBookmarks';
import { useDocBookmarks } from '@site/src/hooks/useDocBookmarks';
import { fetchAccessControlConfig, withCourseAccess } from '@site/src/data/homepageCourses';
import courses from '@site/src/data/courses';
import styles from './bookmarks.module.css';

const COURSE_BY_SLUG = new Map(courses.map((c) => [c.slug, c]));

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function DocBookmarkExplorer({ docBookmarks, onRemove }) {
  const groups = useMemo(() => {
    const bySlug = new Map();
    docBookmarks.forEach((b) => {
      const slug = b.course_slug || 'other';
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push(b);
    });
    return Array.from(bySlug.entries()).map(([slug, pages]) => ({
      slug,
      course: COURSE_BY_SLUG.get(slug),
      pages,
    }));
  }, [docBookmarks]);

  const [collapsed, setCollapsed] = useState(() => new Set());

  const toggleGroup = (slug) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.explorerTitleBar}>
        <span>Saved pages</span>
        <span className={styles.explorerCount}>{docBookmarks.length}</span>
      </div>
      <div className={styles.explorerBody}>
        {groups.map(({ slug, course, pages }) => {
          const isOpen = !collapsed.has(slug);
          return (
            <div key={slug} className={styles.folder}>
              <button
                type="button"
                className={styles.folderHeader}
                onClick={() => toggleGroup(slug)}
                aria-expanded={isOpen}
              >
                <span className={`${styles.folderArrow} ${isOpen ? styles.folderArrowOpen : ''}`}>▶</span>
                <span className={styles.folderIcon}>{course?.icon ?? '📁'}</span>
                <span className={styles.folderName}>{course?.title ?? slug}</span>
                <span className={styles.folderCount}>{pages.length}</span>
              </button>
              {isOpen && (
                <div className={styles.fileList}>
                  {pages.map((p) => (
                    <div key={p.doc_path} className={styles.fileRow}>
                      <Link to={`/docs/${p.doc_path}`} className={styles.fileLink}>
                        <FileIcon />
                        <span className={styles.fileName}>{p.title || p.doc_path}</span>
                      </Link>
                      <button
                        type="button"
                        className={styles.fileRemoveBtn}
                        aria-label="Remove bookmark"
                        onClick={() => onRemove(p.doc_path)}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookmarksContent(): JSX.Element {
  const { bookmarkedSlugs, isBookmarked, toggleBookmark, loading } = useBookmarks();
  const { bookmarks: docBookmarks, toggleDocBookmark, loading: docLoading } = useDocBookmarks();
  const [freeCourses, setFreeCourses] = useState<string[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState(null);

  useEffect(() => {
    fetchAccessControlConfig().then((cfg) => setFreeCourses(cfg.freeCourses ?? []));
  }, []);

  const bookmarkedCourses = withCourseAccess(freeCourses).filter((course) =>
    bookmarkedSlugs.has(course.slug)
  );

  const isLoading = loading || docLoading;
  const hasAnyBookmarks = bookmarkedCourses.length > 0 || docBookmarks.length > 0;

  function handleToggleCourseBookmark(slug) {
    if (isBookmarked(slug)) {
      const course = bookmarkedCourses.find((c) => c.slug === slug);
      setPendingRemoval({ type: 'course', slug, title: course?.title ?? slug });
      return;
    }
    toggleBookmark(slug);
  }

  function handleRemoveDocBookmark(docPath, title) {
    setPendingRemoval({ type: 'doc', docPath, title: title || docPath });
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.type === 'course') {
      toggleBookmark(pendingRemoval.slug);
    } else {
      toggleDocBookmark(pendingRemoval.docPath);
    }
    setPendingRemoval(null);
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.heading}>Bookmarks</h1>
      </div>

      {isLoading ? (
        <p role="status">Loading your bookmarks…</p>
      ) : hasAnyBookmarks ? (
        <>
          {bookmarkedCourses.length > 0 && (
            <CourseGrid
              courses={bookmarkedCourses}
              showDuration
              isBookmarked={isBookmarked}
              onToggleBookmark={handleToggleCourseBookmark}
            />
          )}

          {docBookmarks.length > 0 && (
            <DocBookmarkExplorer docBookmarks={docBookmarks} onRemove={handleRemoveDocBookmark} />
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <p>You haven't bookmarked anything yet.</p>
          <p>Tap the bookmark icon on a course card or lesson page to save it here.</p>
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove bookmark?"
        message={pendingRemoval ? `"${pendingRemoval.title}" will be removed from your bookmarks.` : ''}
        confirmLabel="Remove"
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}

export default function BookmarksPage(): JSX.Element {
  return (
    <DashboardLayout title="Bookmarks" description="Your saved Sypher courses">
      <BookmarksContent />
    </DashboardLayout>
  );
}
