'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCodingProblemBookmark, removeCodingProblemBookmark } from '@/data/codingProblems';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

function BookmarkIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <Bookmark size={13} fill={filled ? 'currentColor' : 'none'} />
  );
}

interface CodingProblemBookmarkButtonProps {
  problemId: string;
  initialBookmarked: boolean;
  /**
   * Optional. Called with the new state as soon as the user toggles
   * (optimistically, before the request finishes) and again with the previous
   * state if the request fails. Lets a list that shows only bookmarked
   * problems (the Bookmarks tab) hide a row instantly and restore it on
   * failure, instead of waiting for the router.refresh() round trip.
   */
  onChange?: (bookmarked: boolean) => void;
}

// Same optimistic-toggle-then-router.refresh() pattern as
// AuthoredBookmarkButton's CourseBookmarkButton, kept as its own component
// since coding problems bookmark by CodingProblem.id through a different
// apps/api route (/coding-problems/{id}/bookmark) than course bookmarks.
export default function CodingProblemBookmarkButton({ problemId, initialBookmarked, onChange }: CodingProblemBookmarkButtonProps): React.JSX.Element {
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
    onChange?.(next);
    trackEvent('bookmark_toggle', { kind: 'coding_problem', action: next ? 'add' : 'remove', problem_id: problemId });
    try {
      await (next ? addCodingProblemBookmark(problemId) : removeCodingProblemBookmark(problemId));
      router.refresh();
    } catch {
      setBookmarked(!next);
      onChange?.(!next);
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
