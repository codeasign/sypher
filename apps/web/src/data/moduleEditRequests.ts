import { apiFetch } from '@/lib/api';

export interface ModuleEditRequest {
  id: string;
  moduleId: string;
  courseId: string;
  proposedBodyMdx: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  module: { title: string; slug: string; courseId: string };
  course: { name: string; slug: string };
  requestedBy: { fullName: string | null; email: string };
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

export async function submitModuleEditRequest(courseId: string, moduleId: string, bodyMdx: string): Promise<{ error: string | null }> {
  const res = await apiFetch('/module-edit-requests', { method: 'POST', body: JSON.stringify({ courseId, moduleId, bodyMdx }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function listPendingModuleEditRequests(): Promise<ModuleEditRequest[]> {
  const res = await apiFetch('/module-edit-requests?status=pending');
  return res.ok ? res.json() : [];
}

export async function approveModuleEditRequest(id: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/module-edit-requests/${id}/approve`, { method: 'PUT' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function rejectModuleEditRequest(id: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/module-edit-requests/${id}/reject`, { method: 'PUT' });
  return res.ok ? { error: null } : { error: await asError(res) };
}
