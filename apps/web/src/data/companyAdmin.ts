import { apiFetch } from '@/lib/api';

/**
 * Corporate-portal admin API client (COMPANY_HR only). Every endpoint is
 * company-scoped server-side from the session — nothing here passes a
 * company id.
 */

export interface CompanyAdminOverview {
  companyName: string;
  accessUntil: string | null;
  seats: number | null;
  employeeCount: number;
  groupCount: number;
  ceilingCourseCount: number;
  ceilingNavCount: number;
}

export interface CompanyAdminGroup {
  id: string;
  name: string;
  memberCount: number;
  courseCount: number;
  navCount: number;
}

export interface CompanyAdminEmployee {
  userId: string;
  email: string;
  fullName: string | null;
  hasPassword: boolean;
  jobTitle: string | null;
  managerName: string | null;
  status: string;
  groupIds: string[];
}

export interface CompanyAdminImportReport {
  rowsProcessed: number;
  created: number;
  linked: number;
  updated: number;
  skipped: { email: string; reason: string }[];
}

export interface GroupCourseCeilingItem {
  id: string;
  name: string;
  slug: string;
  granted: boolean;
}

export interface GroupNavCeilingItem {
  itemKey: string;
  granted: boolean;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function ok(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
}

export const getOverview = () => apiFetch('/company-admin/overview').then((r) => j<CompanyAdminOverview>(r));

export const listGroups = () => apiFetch('/company-admin/groups').then((r) => j<CompanyAdminGroup[]>(r));

export const createGroup = (name: string) =>
  apiFetch('/company-admin/groups', { method: 'POST', body: JSON.stringify({ name }) }).then((r) => j<CompanyAdminGroup>(r));

export const renameGroup = (groupId: string, name: string) =>
  apiFetch(`/company-admin/groups/${groupId}`, { method: 'PUT', body: JSON.stringify({ name }) }).then(ok);

export const deleteGroup = (groupId: string) =>
  apiFetch(`/company-admin/groups/${groupId}`, { method: 'DELETE' }).then(ok);

export const listEmployees = () => apiFetch('/company-admin/employees').then((r) => j<CompanyAdminEmployee[]>(r));

export const importEmployeesCsv = (csv: string) =>
  apiFetch('/company-admin/employees/import', { method: 'POST', body: JSON.stringify({ csv }) }).then((r) =>
    j<CompanyAdminImportReport>(r),
  );

export const setEmployeeGroups = (userId: string, groupIds: string[]) =>
  apiFetch(`/company-admin/employees/${userId}/groups`, { method: 'PUT', body: JSON.stringify({ groupIds }) }).then(ok);

export const resendInvite = (userId: string) =>
  apiFetch(`/company-admin/employees/${userId}/resend-invite`, { method: 'POST' }).then(ok);

export const getInviteLink = (userId: string) =>
  apiFetch(`/company-admin/employees/${userId}/invite-link`, { method: 'POST' }).then((r) =>
    j<{ url: string; email: string }>(r),
  );

export const removeEmployee = (userId: string) =>
  apiFetch(`/company-admin/employees/${userId}`, { method: 'DELETE' }).then(ok);

export const getGroupCourses = (groupId: string) =>
  apiFetch(`/company-admin/groups/${groupId}/courses`).then((r) => j<{ ceiling: GroupCourseCeilingItem[] }>(r));

export const setGroupCourse = (groupId: string, courseId: string, allowed: boolean) =>
  apiFetch(`/company-admin/groups/${groupId}/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify({ allowed }),
  }).then(ok);

export const getGroupNav = (groupId: string) =>
  apiFetch(`/company-admin/groups/${groupId}/nav`).then((r) => j<{ ceiling: GroupNavCeilingItem[] }>(r));

export const setGroupNav = (groupId: string, itemKey: string, allowed: boolean) =>
  apiFetch(`/company-admin/groups/${groupId}/nav/${encodeURIComponent(itemKey)}`, {
    method: 'PUT',
    body: JSON.stringify({ allowed }),
  }).then(ok);
