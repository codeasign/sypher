import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listDocBookmarks, addDocBookmark, removeDocBookmark } from '@/data/docBookmarks';
import { trackEvent } from '@/lib/analytics';

export function useDocBookmarks() {
  const { supabase, user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listDocBookmarks(supabase, user.id).then((rows) => {
      setBookmarks(rows);
      setLoading(false);
    });
  }, [supabase, user]);

  const isDocBookmarked = useCallback(
    (docPath) => bookmarks.some((b) => b.doc_path === docPath),
    [bookmarks]
  );

  const toggleDocBookmark = useCallback(
    async (docPath, { courseSlug, title } = {}) => {
      if (!supabase || !user) return;
      const alreadyBookmarked = bookmarks.some((b) => b.doc_path === docPath);
      trackEvent('bookmark_doc_toggle', { doc_path: docPath, action: alreadyBookmarked ? 'remove' : 'add' });
      setBookmarks((prev) =>
        alreadyBookmarked
          ? prev.filter((b) => b.doc_path !== docPath)
          : [...prev, { doc_path: docPath, course_slug: courseSlug, title }]
      );
      if (alreadyBookmarked) {
        await removeDocBookmark(supabase, user.id, docPath);
      } else {
        await addDocBookmark(supabase, user.id, { docPath, courseSlug, title });
      }
    },
    [supabase, user, bookmarks]
  );

  return { bookmarks, isDocBookmarked, toggleDocBookmark, loading };
}
