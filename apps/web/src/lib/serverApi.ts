import { cookies } from 'next/headers';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * Server Components / route handlers only. `fetch()` running on the Node
 * server has no browser cookie jar — `credentials: 'include'` (which
 * src/lib/api.ts's client-side apiFetch relies on) is a no-op here. The
 * incoming request's cookies have to be read explicitly via next/headers
 * and forwarded by hand on the outgoing request instead.
 */
export async function serverApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return fetch(`${API_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
}
