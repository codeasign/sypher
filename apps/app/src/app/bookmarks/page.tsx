'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { CourseGrid } from '@/components/CourseCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useDocBookmarks } from '@/hooks/useDocBookmarks';
import { withCourseAccess } from '@sypher/course-catalog/src/homepageCourses';
import { fetchCourseAccessRows, hasCourseAccess } from '@/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@/data/companyAccess';
import { useAuth } from '@/contexts/AuthContext';
import courses from '@sypher/course-catalog/src/courses';
import styles from './bookmarks.module.css';

interface DocBookmark {
  doc_path: string;
  course_slug: string | null;
  title: string | null;
}

interface CourseAccessRow {
  course_slug: string;
  allowed_roles: string[];
}

type PendingRemoval =
  | { type: 'course'; slug: string; title: string }
  | { type: 'doc'; docPath: string; title: string };

const COURSE_BY_SLUG = new Map(courses.map((c) => [c.slug, c]));

function BookmarkHeaderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileDocIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PagesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function BookmarkEmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface DocBookmarkExplorerProps {
  docBookmarks: DocBookmark[];
  onRemove: (docPath: string, title?: string) => void;
}

function DocBookmarkExplorer({ docBookmarks, onRemove }: DocBookmarkExplorerProps) {
  const groups = useMemo(() => {
    const bySlug = new Map<string, DocBookmark[]>();
    docBookmarks.forEach((b) => {
      const slug = b.course_slug || 'other';
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug)!.push(b);
    });
    return Array.from(bySlug.entries()).map(([slug, pages]) => ({
      slug,
      course: COURSE_BY_SLUG.get(slug),
      pages,
    }));
  }, [docBookmarks]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleGroup = (slug: string) => {
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
        <span className={styles.explorerTitleIcon}><FolderIcon /></span>
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
                  {pages.map((p: DocBookmark) => (
                    <div key={p.doc_path} className={styles.fileRow}>
                      <Link href={`/docs/${p.doc_path.replace(/\/index$/, '')}`} className={styles.fileLink}>
                        <span className={styles.fileLinkIcon}><FileDocIcon /></span>
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

function BookmarksContent(): React.JSX.Element {
  const { supabase, role, companyName } = useAuth();
  const { bookmarkedSlugs, isBookmarked, toggleBookmark, loading } = useBookmarks();
  const { bookmarks: docBookmarks, toggleDocBookmark, loading: docLoading } = useDocBookmarks();
  const [accessRows, setAccessRows] = useState<CourseAccessRow[]>([]);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  const bookmarkedCourses = withCourseAccess(hasCourseAccess, role, accessRows, companyAllowedSlugs).filter((course) =>
    bookmarkedSlugs.has(course.slug)
  );

  const isLoading = loading || docLoading;
  const hasAnyBookmarks = bookmarkedCourses.length > 0 || docBookmarks.length > 0;
  const totalBookmarks = bookmarkedCourses.length + docBookmarks.length;

  function handleToggleCourseBookmark(slug: string) {
    if (isBookmarked(slug)) {
      const course = bookmarkedCourses.find((c) => c.slug === slug);
      setPendingRemoval({ type: 'course', slug, title: course?.title ?? slug });
      return;
    }
    toggleBookmark(slug);
  }

  function handleRemoveDocBookmark(docPath: string, title?: string) {
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
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><BookmarkHeaderIcon /></span>
          <h1 className={styles.heading}>Bookmarks</h1>
          {totalBookmarks > 0 && (
            <span className={styles.headerCount}>{totalBookmarks}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} />
          <span>Loading your bookmarks…</span>
        </div>
      ) : hasAnyBookmarks ? (
        <>
          {bookmarkedCourses.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeaderIcon}><CoursesIcon /></span>
                <h2 className={styles.sectionTitle}>Courses</h2>
                <span className={styles.sectionCount}>{bookmarkedCourses.length}</span>
              </div>
              <CourseGrid
                courses={bookmarkedCourses}
                showDuration
                isBookmarked={isBookmarked}
                onToggleBookmark={handleToggleCourseBookmark}
              />
            </div>
          )}

          {docBookmarks.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeaderIcon}><PagesIcon /></span>
                <h2 className={styles.sectionTitle}>Pages</h2>
                <span className={styles.sectionCount}>{docBookmarks.length}</span>
              </div>
              <DocBookmarkExplorer docBookmarks={docBookmarks} onRemove={handleRemoveDocBookmark} />
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><BookmarkEmptyIcon /></span>
          <p className={styles.emptyTitle}>No bookmarks yet</p>
          <p>Tap the bookmark icon on a course card or lesson page to save it here.</p>
          <p className={styles.emptyHint}>Your saved courses and pages will appear here.</p>
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

export default function BookmarksPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Bookmarks" description="Your saved Sypher courses">
      <BookmarksContent />
    </DashboardLayout>
  );
}