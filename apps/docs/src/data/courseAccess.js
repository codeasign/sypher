// TODO(Phase 5): real courseAccess.js lives in apps/app/src/data/courseAccess.js
// and reads the `course_access` table via Supabase. Docs has no Supabase client
// of its own anymore (see AuthContext.tsx), so there's no way to know a
// visitor's real role or the real access rows here. Every course is treated
// as locked until Phase 5 wires up read-only access data from app.sypher —
// locked-by-default is the safe choice, since the alternative would expose
// paid/gated courses as freely readable.
export function fetchCourseAccessRows() {
  return Promise.resolve([]);
}

export function hasCourseAccess() {
  return false;
}
