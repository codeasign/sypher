import React, { useEffect, useRef } from 'react';
import DocItemContent from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { useAuth } from '@site/src/contexts/AuthContext';
import { useDocBookmarks } from '@site/src/hooks/useDocBookmarks';
import { trackEvent } from '@site/src/lib/analytics';
import styles from './styles.module.css';

// Named event (distinct from the generic per-route page_view AnalyticsSession
// already fires) so GA4 can report "which course/page is viewed most"
// without unpacking page_path patterns.
function DocPageViewTracker() {
  const { metadata } = useDoc();
  const lastTracked = useRef(null);

  useEffect(() => {
    if (lastTracked.current === metadata.id) return;
    lastTracked.current = metadata.id;
    const courseSlug = metadata.id.split('/')[0];
    trackEvent('doc_page_view', { doc_path: metadata.id, course_slug: courseSlug, title: metadata.title });
  }, [metadata.id, metadata.title]);

  return null;
}

function BookmarkGlyph({ filled }) {
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

function DocBookmarkButton() {
  const { metadata } = useDoc();
  const { user } = useAuth();
  const { isDocBookmarked, toggleDocBookmark } = useDocBookmarks();

  if (!user) {
    return null;
  }

  const docPath = metadata.id;
  const courseSlug = docPath.split('/')[0];
  const bookmarked = isDocBookmarked(docPath);

  return (
    <button
      type="button"
      className={styles.bookmarkBtn}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-pressed={bookmarked}
      onClick={() => toggleDocBookmark(docPath, { courseSlug, title: metadata.title })}
    >
      <BookmarkGlyph filled={bookmarked} />
      <span>{bookmarked ? 'Bookmarked' : 'Bookmark this page'}</span>
    </button>
  );
}

export default function DocItemContentWrapper(props) {
  return (
    <>
      <DocPageViewTracker />
      <div className={styles.toolbar}>
        <DocBookmarkButton />
      </div>
      <DocItemContent {...props} />
    </>
  );
}
