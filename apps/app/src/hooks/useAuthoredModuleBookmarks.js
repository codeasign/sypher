import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listAuthoredModuleBookmarks,
  addAuthoredModuleBookmark,
  removeAuthoredModuleBookmark,
} from '@/data/authoredBookmarks';
import { trackEvent } from '@/lib/analytics';

export function useAuthoredModuleBookmarks() {
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
    listAuthoredModuleBookmarks(supabase, user.id).then((rows) => {
      setBookmarks(rows);
      setLoading(false);
    });
  }, [supabase, user]);

  const isModuleBookmarked = useCallback(
    (moduleId) => bookmarks.some((b) => b.module_id === moduleId),
    [bookmarks]
  );

  const toggleModuleBookmark = useCallback(
    async (moduleId, courseId) => {
      if (!supabase || !user) return;
      const alreadyBookmarked = bookmarks.some((b) => b.module_id === moduleId);
      trackEvent('bookmark_authored_module_toggle', { module_id: moduleId, action: alreadyBookmarked ? 'remove' : 'add' });
      setBookmarks((prev) =>
        alreadyBookmarked
          ? prev.filter((b) => b.module_id !== moduleId)
          : [...prev, { module_id: moduleId, course_id: courseId }]
      );
      if (alreadyBookmarked) {
        await removeAuthoredModuleBookmark(supabase, user.id, moduleId);
      } else {
        await addAuthoredModuleBookmark(supabase, user.id, moduleId, courseId);
      }
    },
    [supabase, user, bookmarks]
  );

  return { bookmarks, isModuleBookmarked, toggleModuleBookmark, loading };
}
