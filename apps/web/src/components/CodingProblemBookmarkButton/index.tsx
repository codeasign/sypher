'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCodingProblemBookmark, removeCodingProblemBookmark } from '@/data/codingProblems';
import styles from './styles.module.css';

function BookmarkIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface CodingProblemBookmarkButtonProps {
  problemId: string;
  initialBookmarked: boolean;
}

// Same optimistic-toggle-then-router.refresh() pattern as
// AuthoredBookmarkButton's CourseBookmarkButton, kept as its own component
// since coding problems bookmark by CodingProblem.id through a different
// apps/api route (/coding-problems/{id}/bookmark) than course bookmarks.
export default function CodingProblemBookmarkButton({ problemId, initialBookmarked }: CodingProblemBookmarkButtonProps): React.JSX.Element {
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
      await (next ? addCodingProblemBookmark(problemId) : removeCodingProblemBookmark(problemId));
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
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
    >
      <BookmarkIcon filled={bookmarked} />
    </button>
  );
}
