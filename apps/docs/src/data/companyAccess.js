// TODO(Phase 5): real companyAccess.js lives in apps/app/src/data/companyAccess.js
// and reads the `company_course_access` table via Supabase. Docs has no
// Supabase client of its own anymore (see AuthContext.tsx) — always resolve to
// no company access until Phase 5 wires this up from app.sypher.
export function fetchCompanyCourseAccessRows() {
  return Promise.resolve(new Set());
}
