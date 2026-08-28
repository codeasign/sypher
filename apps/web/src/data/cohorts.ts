import { apiFetch } from '@/lib/api';

export interface Cohort {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  startDate: string | null;
  durationWeeks: number | null;
  seatsTotal: number | null;
  priceLabel: string | null;
  status: 'draft' | 'live' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface RosterEntry {
  userId: string;
  email: string;
  fullName: string | null;
  status: 'active' | 'removed';
  enrolledAt: string;
  deletedAt: string | null;
}

export interface ManagerEntry {
  userId: string;
  email: string;
  fullName: string | null;
  assignedAt: string;
}

export interface MemberCourseAccessEntry {
  userId: string;
  courseSlug: string;
}

interface CohortFields {
  title: string;
  description: string;
  content?: string;
  coverImageUrl?: string | null;
  startDate?: string | null;
  durationWeeks?: number | null;
  seatsTotal?: number | null;
  priceLabel?: string | null;
}

async function asJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

// Public GET /cohorts and /cohorts/{slug} are deliberately NOT wrapped here
// — those two reads happen from Server Components (apps/web/src/app/cohorts/
// page.tsx and cohorts/[slug]/page.tsx), which must use serverApiFetch (see
// @/lib/serverApi) instead of the apiFetch used below, matching the same
// convention apps/web/src/app/dashboard/page.tsx already establishes. This
// module is for client-component consumers only (CohortEditor,
// launch-cohort, manage-cohort-users).

// ---- Management (launch-cohort) ----

export async function listCohorts(): Promise<Cohort[]> {
  const res = await apiFetch('/cohorts/manage/list');
  return res.ok ? asJson(res) : [];
}

export async function createCohort(fields: CohortFields): Promise<{ error: string | null; cohort: Cohort | null }> {
  const res = await apiFetch('/cohorts', { method: 'POST', body: JSON.stringify(fields) });
  if (!res.ok) return { error: await asError(res), cohort: null };
  return { error: null, cohort: await asJson<Cohort>(res) };
}

export async function updateCohort(id: string, fields: Partial<CohortFields>): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function setCohortStatus(id: string, status: Cohort['status']): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function deleteCohort(id: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${id}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Roster ----

export async function listManageableCohorts(): Promise<Cohort[]> {
  const res = await apiFetch('/cohorts/manage/roster-cohorts');
  return res.ok ? asJson(res) : [];
}

export async function listCohortRoster(cohortId: string): Promise<RosterEntry[]> {
  const res = await apiFetch(`/cohorts/${cohortId}/roster`);
  return res.ok ? asJson(res) : [];
}

export async function setCohortMemberStatus(cohortId: string, userId: string, active: boolean): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/roster/${userId}`, { method: 'PUT', body: JSON.stringify({ active }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

/**
 * Add someone to the roster by email. If they have no Sypher account, one
 * is provisioned and they're emailed a welcome + set-password link.
 * `fullName` is only used when a new account is created.
 */
export async function addCohortMemberByEmail(
  cohortId: string,
  email: string,
  fullName?: string,
): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/roster/by-email`, {
    method: 'POST',
    body: JSON.stringify({ email, fullName }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Course pool (admin-only write) ----

export async function listCohortCoursePool(cohortId: string): Promise<string[]> {
  const res = await apiFetch(`/cohorts/${cohortId}/course-pool`);
  return res.ok ? asJson(res) : [];
}

export async function setCohortCourseAccess(cohortId: string, slug: string, allowed: boolean): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/course-pool/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify({ allowed }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Per-member course access ----

export async function listCohortMemberCourseAccess(cohortId: string): Promise<MemberCourseAccessEntry[]> {
  const res = await apiFetch(`/cohorts/${cohortId}/member-course-access`);
  return res.ok ? asJson(res) : [];
}

export async function setCohortMemberCourseAccess(
  cohortId: string,
  userId: string,
  courseSlug: string,
  allowed: boolean,
): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/member-course-access/${userId}/${encodeURIComponent(courseSlug)}`, {
    method: 'PUT',
    body: JSON.stringify({ allowed }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Managers (admin-only) ----

export async function listCohortManagers(cohortId: string): Promise<ManagerEntry[]> {
  const res = await apiFetch(`/cohorts/${cohortId}/managers`);
  return res.ok ? asJson(res) : [];
}

export async function addCohortManager(cohortId: string, userId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/managers`, { method: 'POST', body: JSON.stringify({ userId }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

/** Add a manager by email — provisions + emails a set-password link if new. */
export async function addCohortManagerByEmail(
  cohortId: string,
  email: string,
  fullName?: string,
): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/managers/by-email`, {
    method: 'POST',
    body: JSON.stringify({ email, fullName }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function removeCohortManager(cohortId: string, userId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/cohorts/${cohortId}/managers/${userId}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// Replaces the old findProfileByEmail — same "look someone up by email"
// purpose, now also used to add an existing member to a cohort's roster
// (see note in manage-cohort-users/page.tsx about why the invite-by-email
// flow was dropped from this port).
export async function lookupUserByEmail(email: string): Promise<{ id: string; email: string; fullName: string | null } | null> {
  const res = await apiFetch(`/cohorts/lookup-user?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  return asJson(res);
}
