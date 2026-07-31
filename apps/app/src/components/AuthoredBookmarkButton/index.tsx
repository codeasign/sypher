'use client';

import React from 'react';
import { useAuthoredCourseBookmarks } from '@/hooks/useAuthoredCourseBookmarks';
import { useAuthoredModuleBookmarks } from '@/hooks/useAuthoredModuleBookmarks';
import styles from './styles.module.css';

function BookmarkGlyph({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkButton({
  bookmarked,
  onToggle,
}: {
  bookmarked: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button type="button" className={styles.bookmarkBtn} aria-pressed={bookmarked} onClick={onToggle}>
      <BookmarkGlyph filled={bookmarked} />
      <span className={styles.bookmarkLabel}>{bookmarked ? 'Bookmarked' : 'Bookmark this page'}</span>
    </button>
  );
}

export function CourseBookmarkButton({ courseId }: { courseId: string }): React.JSX.Element | null {
  const { isCourseBookmarked, toggleCourseBookmark, loading } = useAuthoredCourseBookmarks();
  if (loading) return null;
  return (
    <BookmarkButton
      bookmarked={isCourseBookmarked(courseId)}
      onToggle={() => toggleCourseBookmark(courseId)}
    />
  );
}

export function ModuleBookmarkButton({
  moduleId,
  courseId,
}: {
  moduleId: string;
  courseId: string;
}): React.JSX.Element | null {
  const { isModuleBookmarked, toggleModuleBookmark, loading } = useAuthoredModuleBookmarks();
  if (loading) return null;
  return (
    <BookmarkButton
      bookmarked={isModuleBookmarked(moduleId)}
      onToggle={() => toggleModuleBookmark(moduleId, courseId)}
    />
  );
}
