import { apiFetch } from '@/lib/api';

export interface TestAccountRow {
  id: string | null;
  email: string;
  fullName: string;
  role: string;
  companyName?: string;
  exists: boolean;
  onboarded: boolean;
  roleEditable: boolean;
}

export async function listTestAccounts(): Promise<TestAccountRow[]> {
  const res = await apiFetch('/admin/test-accounts');
  if (!res.ok) return [];
  return res.json();
}

/**
 * `role` only matters the first time an email is reset — if it isn't
 * already on the roster, the backend registers it as a new role-editable
 * custom account with that role (defaulting to FREE_USER) instead of
 * rejecting it. This is also how "add a new email" in the
 * Role-Switchable Accounts panel works — no separate create endpoint.
 */
export async function resetTestAccount(email: string, role?: string): Promise<{ error?: string }> {
  const res = await apiFetch('/admin/test-accounts/reset', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Reset failed' };
  }
  return {};
}

export async function setTestAccountRole(email: string, role: string): Promise<{ error?: string }> {
  const res = await apiFetch('/admin/test-accounts/role', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Role change failed' };
  }
  return {};
}
