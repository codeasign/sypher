import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listAuthoredCourseBookmarks,
  addAuthoredCourseBookmark,
  removeAuthoredCourseBookmark,
} from '@/data/authoredBookmarks';
import { trackEvent } from '@/lib/analytics';

export function useAuthoredCourseBookmarks() {
  const { supabase, user } = useAuth();
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setBookmarkedCourseIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    listAuthoredCourseBookmarks(supabase, user.id).then((courseIds) => {
      setBookmarkedCourseIds(new Set(courseIds));
      setLoading(false);
    });
  }, [supabase, user]);

  const isCourseBookmarked = useCallback(
    (courseId) => bookmarkedCourseIds.has(courseId),
    [bookmarkedCourseIds]
  );

  const toggleCourseBookmark = useCallback(
    async (courseId) => {
      if (!supabase || !user) return;
      const alreadyBookmarked = bookmarkedCourseIds.has(courseId);
      trackEvent('bookmark_authored_course_toggle', { course_id: courseId, action: alreadyBookmarked ? 'remove' : 'add' });
      setBookmarkedCourseIds((prev) => {
        const next = new Set(prev);
        if (alreadyBookmarked) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
      if (alreadyBookmarked) {
        await removeAuthoredCourseBookmark(supabase, user.id, courseId);
      } else {
        await addAuthoredCourseBookmark(supabase, user.id, courseId);
      }
    },
    [supabase, user, bookmarkedCourseIds]
  );

  return { bookmarkedCourseIds, isCourseBookmarked, toggleCourseBookmark, loading };
}
