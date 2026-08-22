'use client';

import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface ModuleCompletionTrackerProps {
  courseSlug: string;
  moduleSlug: string;
}

// Fires once per page load, not once ever — the endpoint is idempotent
// (ModuleProgressRepository.markComplete upserts on the unique
// (userId, moduleId) constraint), so revisiting an already-completed
// module is a harmless no-op, not a duplicate or a reset. Renders nothing;
// this is purely a side-effect trigger since the page it lives in is a
// Server Component and can't fire a client-side POST itself.
export default function ModuleCompletionTracker({ courseSlug, moduleSlug }: ModuleCompletionTrackerProps): null {
  useEffect(() => {
    void apiFetch(`/courses/${encodeURIComponent(courseSlug)}/modules/${encodeURIComponent(moduleSlug)}/complete`, { method: 'POST' });
  }, [courseSlug, moduleSlug]);

  return null;
}
