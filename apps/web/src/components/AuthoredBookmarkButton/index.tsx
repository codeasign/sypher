'use client';

import { useState } from 'react';
import {
  addAuthoredCourseBookmark,
  removeAuthoredCourseBookmark,
  addAuthoredModuleBookmark,
  removeAuthoredModuleBookmark,
} from '@/data/bookmarks';
import styles from './styles.module.css';

function BookmarkIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface CourseBookmarkButtonProps {
  courseId: string;
  initialBookmarked: boolean;
  onChange?: (bookmarked: boolean) => void;
}

export function CourseBookmarkButton({ courseId, initialBookmarked, onChange }: CourseBookmarkButtonProps): React.JSX.Element {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await (next ? addAuthoredCourseBookmark(courseId) : removeAuthoredCourseBookmark(courseId));
      onChange?.(next);
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this course'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this course'}
    >
      <BookmarkIcon filled={bookmarked} />
    </button>
  );
}

interface ModuleBookmarkButtonProps {
  moduleId: string;
  courseId: string;
  initialBookmarked: boolean;
  onChange?: (bookmarked: boolean) => void;
}

export function ModuleBookmarkButton({ moduleId, courseId, initialBookmarked, onChange }: ModuleBookmarkButtonProps): React.JSX.Element {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  async function toggle(): Promise<void> {
    if (pending) return;
    setPending(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await (next ? addAuthoredModuleBookmark(moduleId, courseId) : removeAuthoredModuleBookmark(moduleId));
      onChange?.(next);
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.textButton}
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this module'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this module'}
    >
      <BookmarkIcon filled={bookmarked} />
      {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </button>
  );
}
