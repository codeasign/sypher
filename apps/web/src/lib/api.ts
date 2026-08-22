const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/**
 * Every data operation goes through this — no Next.js API routes. Works
 * server-side (SSR) and client-side alike; `credentials: 'include'` is
 * what lets the httpOnly session cookie (set by apps/api on the shared
 * `.sypher.local` domain) ride along on both.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
