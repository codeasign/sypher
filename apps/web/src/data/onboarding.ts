import { apiFetch } from '@/lib/api';

export interface OnboardResult {
  ok: boolean;
  error?: string;
}

/** The 10 preset avatar paths (see apps/web/scripts/gen-avatars.mjs). */
export const PRESET_AVATARS: string[] = Array.from(
  { length: 10 },
  (_, i) => `/avatars/avatar-${String(i + 1).padStart(2, '0')}.svg`,
);

export async function checkHandleAvailable(handle: string): Promise<{ available: boolean; valid: boolean }> {
  const res = await apiFetch(`/auth/handle-available?handle=${encodeURIComponent(handle)}`);
  if (!res.ok) return { available: false, valid: false };
  return res.json();
}

export async function submitOnboarding(input: {
  username: string;
  avatarUrl: string;
  acceptedLegal: boolean;
}): Promise<OnboardResult> {
  const res = await apiFetch('/auth/onboard', { method: 'POST', body: JSON.stringify(input) });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return { ok: false, error: body.message ?? 'Something went wrong. Please try again.' };
}
