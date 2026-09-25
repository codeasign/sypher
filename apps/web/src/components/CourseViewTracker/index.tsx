'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

interface CourseViewTrackerProps {
  courseId: string;
  courseSlug: string;
  hasFullAccess: boolean;
  started: boolean;
}

// Course home page (/learn/[slug]) is a Server Component and can't fire a
// client-side analytics call itself -- mirrors ModuleCompletionTracker's
// side-effect-only pattern. Gives "popular courses" a clean course_slug
// dimension the same way blog_post_view does for posts, instead of relying
// on parsing the Pages report's page_path.
export default function CourseViewTracker({ courseId, courseSlug, hasFullAccess, started }: CourseViewTrackerProps): null {
  useEffect(() => {
    trackEvent('course_view', { course_id: courseId, course_slug: courseSlug, has_full_access: hasFullAccess, started });
  }, [courseId, courseSlug, hasFullAccess, started]);

  return null;
}
