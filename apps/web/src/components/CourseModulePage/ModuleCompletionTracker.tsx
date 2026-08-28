'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface ModuleCompletionTrackerProps {
  courseSlug: string;
  moduleSlug: string;
  // The module's completed flag as of this page's server render. When it's
  // already true there's nothing to refresh — the POST is a no-op and a
  // router.refresh() would just refetch the RSC tree for no visible change.
  alreadyComplete: boolean;
}

// Fires once per page load, not once ever — the endpoint is idempotent
// (ModuleProgressRepository.markComplete upserts on the unique
// (userId, moduleId) constraint), so revisiting an already-completed
// module is a harmless no-op, not a duplicate or a reset. Renders nothing;
// this is purely a side-effect trigger since the page it lives in is a
// Server Component and can't fire a client-side POST itself.
export default function ModuleCompletionTracker({ courseSlug, moduleSlug, alreadyComplete }: ModuleCompletionTrackerProps): null {
  const router = useRouter();

  useEffect(() => {
    const path = `/courses/${encodeURIComponent(courseSlug)}/modules/${encodeURIComponent(moduleSlug)}/complete`;
    apiFetch(path, { method: 'POST' })
      .then((res) => {
        // Don't swallow a failed mark-complete — a non-2xx here means the
        // module never got recorded as read (no completion dot, no course
        // completion). Logging it makes the failure visible instead of
        // looking like "progress tracking is broken" with no trace.
        if (!res.ok) {
          console.error(`[ModuleCompletionTracker] mark-complete failed: ${res.status} ${res.statusText} (${path})`);
          return;
        }
        // The /learn/[slug] layout (CourseModuleIndex + the prev/next
        // pager) is rendered server-side and its RSC payload is cached for
        // the whole subtree — client navigation between modules never
        // re-runs its data fetch, so the just-earned completion dot would
        // stay grey until a full reload. router.refresh() refetches the
        // Server Components for the current route INCLUDING the layout,
        // so the dot (and course-outline progress) updates immediately.
        if (!alreadyComplete) {
          router.refresh();
        }
      })
      .catch((err) => {
        console.error('[ModuleCompletionTracker] mark-complete request errored', err);
      });
  }, [courseSlug, moduleSlug, alreadyComplete, router]);

  return null;
}
