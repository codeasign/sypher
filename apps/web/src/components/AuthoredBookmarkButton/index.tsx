'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addAuthoredCourseBookmark,
  removeAuthoredCourseBookmark,
  addAuthoredModuleBookmark,
  removeAuthoredModuleBookmark,
} from '@/data/bookmarks';
import styles from './styles.module.css';

function BookmarkIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <Bookmark size={18} fill={filled ? 'currentColor' : 'none'} />
  );
}

interface CourseBookmarkButtonProps {
  courseId: string;
  initialBookmarked: boolean;
  onChange?: (bookmarked: boolean) => void;
}

export function CourseBookmarkButton({ courseId, initialBookmarked, onChange }: CourseBookmarkButtonProps): React.JSX.Element {
  const router = useRouter();
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
      // Keep server-rendered bookmark state in sync (the /bookmarks page,
      // and this button's own initialBookmarked prop when the route is
      // revisited via cached client navigation) — the write already
      // succeeded, this just refetches the RSC tree so nothing shows stale.
      router.refresh();
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
  /**
   * Render just the bookmark icon (round icon button, like the course
   * bookmark) without the "Bookmark" / "Bookmarked" text. Default false --
   * the lesson page keeps the labelled button.
   */
  iconOnly?: boolean;
}

export function ModuleBookmarkButton({ moduleId, courseId, initialBookmarked, onChange, iconOnly = false }: ModuleBookmarkButtonProps): React.JSX.Element {
  const router = useRouter();
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
      router.refresh();
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={iconOnly ? styles.iconButton : styles.textButton}
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this module'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this module'}
    >
      <BookmarkIcon filled={bookmarked} />
      {!iconOnly && (bookmarked ? 'Bookmarked' : 'Bookmark')}
    </button>
  );
}
