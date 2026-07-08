import React from 'react';
import DocItemContent from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { useAuth } from '@site/src/contexts/AuthContext';
import { useDocBookmarks } from '@site/src/hooks/useDocBookmarks';
import styles from './styles.module.css';

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
      <div className={styles.toolbar}>
        <DocBookmarkButton />
      </div>
      <DocItemContent {...props} />
    </>
  );
}
