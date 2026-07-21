import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listBookmarkedSlugs, addBookmark, removeBookmark } from '@/data/bookmarks';
import { trackEvent } from '@/lib/analytics';

export function useBookmarks() {
  const { supabase, user } = useAuth();
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setBookmarkedSlugs(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    listBookmarkedSlugs(supabase, user.id).then((slugs) => {
      setBookmarkedSlugs(new Set(slugs));
      setLoading(false);
    });
  }, [supabase, user]);

  const isBookmarked = useCallback((slug) => bookmarkedSlugs.has(slug), [bookmarkedSlugs]);

  const toggleBookmark = useCallback(
    async (slug) => {
      if (!supabase || !user) return;
      const alreadyBookmarked = bookmarkedSlugs.has(slug);
      trackEvent('bookmark_course_toggle', { slug, action: alreadyBookmarked ? 'remove' : 'add' });
      setBookmarkedSlugs((prev) => {
        const next = new Set(prev);
        if (alreadyBookmarked) next.delete(slug);
        else next.add(slug);
        return next;
      });
      if (alreadyBookmarked) {
        await removeBookmark(supabase, user.id, slug);
      } else {
        await addBookmark(supabase, user.id, slug);
      }
    },
    [supabase, user, bookmarkedSlugs]
  );

  return { bookmarkedSlugs, isBookmarked, toggleBookmark, loading };
}
