import { apiFetch } from '@/lib/api';

export interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: 'draft' | 'published';
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CourseWithAccess extends Course {
  hasFullAccess: boolean;
}

export interface CourseModule {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  moduleType: string;
  isCertification: boolean;
  bodyMdx: string;
  orderIndex: number;
  sectionLabel: string | null;
  sectionOrder: number | null;
  authoringMode: 'manual' | 'generated';
  showInGettingStarted: boolean;
  gettingStartedOrder: number | null;
  createdAt: string;
  updatedAt: string;
  // Only present on GET /courses/{slug}/modules and GET .../modules/{slug}
  // (per-user, computed server-side) — absent on the management
  // endpoints. locked modules have bodyMdx stripped to '' server-side —
  // never trust a truthy bodyMdx on a locked module, the content simply
  // isn't sent.
  completed?: boolean;
  locked?: boolean;
}

export interface GettingStartedModuleEntry {
  id: string;
  slug: string;
  title: string;
  gettingStartedOrder: number | null;
  course: { slug: string; name: string };
}

interface CourseFields {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
}

interface CourseModuleFields {
  title: string;
  bodyMdx?: string;
  showInGettingStarted?: boolean;
}

async function asJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

// Public GET /courses, /courses/{slug}, /courses/{slug}/modules,
// /courses/{slug}/modules/{moduleSlug} and /courses/getting-started are
// deliberately NOT wrapped here — those reads happen from Server Components
// (serverApiFetch), matching the same convention cohorts.ts establishes.
// This module is for client-component consumers only (/manage-courses).

// ---- Management (courses) ----

export async function listCourses(): Promise<Course[]> {
  const res = await apiFetch('/courses/manage/list');
  return res.ok ? asJson(res) : [];
}

export async function getCourse(id: string): Promise<Course | null> {
  const res = await apiFetch(`/courses/manage/${id}`);
  return res.ok ? asJson(res) : null;
}

export async function createCourse(fields: CourseFields): Promise<{ error: string | null; course: Course | null }> {
  const res = await apiFetch('/courses', { method: 'POST', body: JSON.stringify(fields) });
  if (!res.ok) return { error: await asError(res), course: null };
  return { error: null, course: await asJson<Course>(res) };
}

export async function updateCourse(id: string, fields: Partial<CourseFields>): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function setCourseStatus(id: string, status: Course['status']): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function deleteCourse(id: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${id}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Management (modules) ----

export async function listCourseModules(courseId: string): Promise<CourseModule[]> {
  const res = await apiFetch(`/courses/${courseId}/manage/modules`);
  return res.ok ? asJson(res) : [];
}

export async function createCourseModule(
  courseId: string,
  fields: CourseModuleFields,
): Promise<{ error: string | null; module: CourseModule | null }> {
  const res = await apiFetch(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(fields) });
  if (!res.ok) return { error: await asError(res), module: null };
  return { error: null, module: await asJson<CourseModule>(res) };
}

export async function updateCourseModule(
  courseId: string,
  moduleId: string,
  fields: Partial<CourseModuleFields>,
): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${courseId}/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(fields) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function reorderCourseModule(
  courseId: string,
  moduleId: string,
  direction: 'up' | 'down',
): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${courseId}/modules/${moduleId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ direction }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function deleteCourseModule(courseId: string, moduleId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ---- Access ----

export async function getCourseAccessRoles(courseId: string): Promise<string[]> {
  const res = await apiFetch(`/courses/${courseId}/access`);
  if (!res.ok) return [];
  const body = await asJson<{ allowedRoles: string[] }>(res);
  return body.allowedRoles;
}

export async function setCourseAccessRoles(courseId: string, allowedRoles: string[]): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${courseId}/access/roles`, { method: 'PUT', body: JSON.stringify({ allowedRoles }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function listCourseAccessCompanies(courseId: string): Promise<string[]> {
  const res = await apiFetch(`/courses/${courseId}/access/companies`);
  return res.ok ? asJson(res) : [];
}

export async function setCourseAccessCompany(courseId: string, companyId: string, allowed: boolean): Promise<{ error: string | null }> {
  const res = await apiFetch(`/courses/${courseId}/access/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify({ allowed }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}
