'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { CourseGrid } from '@/components/CourseCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useDocBookmarks } from '@/hooks/useDocBookmarks';
import { useAuthoredCourseBookmarks } from '@/hooks/useAuthoredCourseBookmarks';
import { useAuthoredModuleBookmarks } from '@/hooks/useAuthoredModuleBookmarks';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import { withCourseAccess } from '@sypher/course-catalog/src/homepageCourses';
import { fetchCourseAccessRows, hasCourseAccess } from '@/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@/data/companyAccess';
import { getCoursesByIds, getCourseModulesByIdsWithCourse } from '@/data/courses';
import CourseDescriptionMarkdown from '@/components/CourseDescriptionMarkdown';
import { useAuth } from '@/contexts/AuthContext';
import { BookmarkIcon, CoursesIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
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

interface AuthoredCourseBookmark {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface AuthoredModuleBookmark {
  id: string;
  slug: string;
  title: string;
  course_id: string;
  courses: { slug: string; name: string } | null;
}

interface AuthoredModuleBookmarkRow {
  module_id: string;
  course_id: string;
}

type PendingRemoval =
  | { type: 'course'; slug: string; title: string }
  | { type: 'doc'; docPath: string; title: string }
  | { type: 'authoredCourse'; courseId: string; title: string }
  | { type: 'authoredModule'; moduleId: string; title: string };

const COURSE_BY_SLUG = new Map(courses.map((c) => [c.slug, c]));

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
                      <a href={`${getDocsOrigin()}/docs/${p.doc_path.replace(/\/index$/, '')}/`} className={styles.fileLink}>
                        <span className={styles.fileLinkIcon}><FileDocIcon /></span>
                        <span className={styles.fileName}>{p.title || p.doc_path}</span>
                      </a>
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

interface AuthoredCourseGridProps {
  authoredCourses: AuthoredCourseBookmark[];
  onRemove: (courseId: string, title: string) => void;
}

function AuthoredCourseGrid({ authoredCourses, onRemove }: AuthoredCourseGridProps) {
  return (
    <div className={styles.authoredCourseGrid}>
      {authoredCourses.map((course) => (
        <div key={course.id} className={styles.authoredCourseCard}>
          <Link href={`/courses/${course.slug}`} className={styles.authoredCourseLink}>
            <span className={styles.authoredCourseIcon}><CoursesIcon /></span>
            <div className={styles.authoredCourseBody}>
              <div className={styles.authoredCourseTitle}>{course.name}</div>
              {course.description && (
                <CourseDescriptionMarkdown text={course.description} className={styles.authoredCourseDesc} />
              )}
            </div>
          </Link>
          <button
            type="button"
            className={styles.fileRemoveBtn}
            aria-label="Remove bookmark"
            onClick={() => onRemove(course.id, course.name)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

interface AuthoredModuleBookmarkListProps {
  authoredModules: AuthoredModuleBookmark[];
  onRemove: (moduleId: string, title: string) => void;
}

// Flat list grouped by course_id, no folder collapse -- modules are flat
// (no category tree), unlike DocBookmarkExplorer's nested folders.
function AuthoredModuleBookmarkList({ authoredModules, onRemove }: AuthoredModuleBookmarkListProps) {
  const groups = useMemo(() => {
    const byCourse = new Map<string, AuthoredModuleBookmark[]>();
    authoredModules.forEach((m) => {
      if (!byCourse.has(m.course_id)) byCourse.set(m.course_id, []);
      byCourse.get(m.course_id)!.push(m);
    });
    return Array.from(byCourse.values());
  }, [authoredModules]);

  return (
    <div className={styles.explorer}>
      <div className={styles.explorerBody}>
        {groups.map((group) => (
          <div key={group[0].course_id} className={styles.folder}>
            <div className={styles.authoredModuleGroupTitle}>{group[0].courses?.name ?? 'Course'}</div>
            <div className={styles.fileList}>
              {group.map((m) => (
                <div key={m.id} className={styles.fileRow}>
                  <Link href={`/courses/${m.courses?.slug}/${m.slug}`} className={styles.fileLink}>
                    <span className={styles.fileLinkIcon}><FileDocIcon /></span>
                    <span className={styles.fileName}>{m.title}</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.fileRemoveBtn}
                    aria-label="Remove bookmark"
                    onClick={() => onRemove(m.id, m.title)}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookmarksContent(): React.JSX.Element {
  const { supabase, role, companyName } = useAuth();
  const { bookmarkedSlugs, isBookmarked, toggleBookmark, loading } = useBookmarks();
  const { bookmarks: docBookmarks, toggleDocBookmark, loading: docLoading } = useDocBookmarks();
  const {
    bookmarkedCourseIds: authoredCourseBookmarkIds,
    toggleCourseBookmark: toggleAuthoredCourseBookmark,
    loading: authoredCourseLoading,
  } = useAuthoredCourseBookmarks();
  const {
    bookmarks: authoredModuleBookmarkRowsRaw,
    toggleModuleBookmark: toggleAuthoredModuleBookmark,
    loading: authoredModuleLoading,
  } = useAuthoredModuleBookmarks();
  const authoredModuleBookmarkRows = authoredModuleBookmarkRowsRaw as AuthoredModuleBookmarkRow[];
  const [accessRows, setAccessRows] = useState<CourseAccessRow[]>([]);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [authoredCourses, setAuthoredCourses] = useState<AuthoredCourseBookmark[]>([]);
  const [authoredModules, setAuthoredModules] = useState<AuthoredModuleBookmark[]>([]);

  useEffect(() => {
    trackEvent('bookmarks_page_view');
  }, []);

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  const authoredCourseIdsKey = Array.from(authoredCourseBookmarkIds).sort().join(',');
  useEffect(() => {
    const ids = authoredCourseIdsKey ? authoredCourseIdsKey.split(',') : [];
    if (ids.length === 0) {
      setAuthoredCourses([]);
      return;
    }
    getCoursesByIds(supabase, ids).then(setAuthoredCourses);
  }, [supabase, authoredCourseIdsKey]);

  const authoredModuleIdsKey = authoredModuleBookmarkRows
    .map((b) => b.module_id)
    .sort()
    .join(',');
  useEffect(() => {
    const ids = authoredModuleIdsKey ? authoredModuleIdsKey.split(',') : [];
    if (ids.length === 0) {
      setAuthoredModules([]);
      return;
    }
    getCourseModulesByIdsWithCourse(supabase, ids).then(setAuthoredModules);
  }, [supabase, authoredModuleIdsKey]);

  const bookmarkedCourses = withCourseAccess(hasCourseAccess, role, accessRows, companyAllowedSlugs).filter((course) =>
    bookmarkedSlugs.has(course.slug)
  );

  const isLoading = loading || docLoading || authoredCourseLoading || authoredModuleLoading;
  const hasAnyBookmarks =
    bookmarkedCourses.length > 0 || docBookmarks.length > 0 || authoredCourses.length > 0 || authoredModules.length > 0;
  const totalBookmarks =
    bookmarkedCourses.length + docBookmarks.length + authoredCourses.length + authoredModules.length;

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

  function handleRemoveAuthoredCourseBookmark(courseId: string, title: string) {
    setPendingRemoval({ type: 'authoredCourse', courseId, title });
  }

  function handleRemoveAuthoredModuleBookmark(moduleId: string, title: string) {
    setPendingRemoval({ type: 'authoredModule', moduleId, title });
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    trackEvent('bookmark_remove_confirm', { type: pendingRemoval.type });
    if (pendingRemoval.type === 'course') {
      toggleBookmark(pendingRemoval.slug);
    } else if (pendingRemoval.type === 'doc') {
      toggleDocBookmark(pendingRemoval.docPath);
    } else if (pendingRemoval.type === 'authoredCourse') {
      toggleAuthoredCourseBookmark(pendingRemoval.courseId);
    } else {
      const bookmarkRow = authoredModuleBookmarkRows.find((b) => b.module_id === pendingRemoval.moduleId);
      toggleAuthoredModuleBookmark(pendingRemoval.moduleId, bookmarkRow?.course_id);
    }
    setPendingRemoval(null);
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <BookmarkIcon />
        </div>
        <div>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>Bookmarks</h1>
            {totalBookmarks > 0 && <span className={styles.headerCount}>{totalBookmarks}</span>}
          </div>
          <p className={styles.subtitle}>Courses and pages you&apos;ve saved for later.</p>
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

          {authoredCourses.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeaderIcon}><CoursesIcon /></span>
                <h2 className={styles.sectionTitle}>My Courses</h2>
                <span className={styles.sectionCount}>{authoredCourses.length}</span>
              </div>
              <AuthoredCourseGrid authoredCourses={authoredCourses} onRemove={handleRemoveAuthoredCourseBookmark} />
            </div>
          )}

          {authoredModules.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeaderIcon}><PagesIcon /></span>
                <h2 className={styles.sectionTitle}>My Course Modules</h2>
                <span className={styles.sectionCount}>{authoredModules.length}</span>
              </div>
              <AuthoredModuleBookmarkList authoredModules={authoredModules} onRemove={handleRemoveAuthoredModuleBookmark} />
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