import { apiFetch } from '@/lib/api';

/**
 * Corporate portal (corporate.sypher.local) data layer. Two calls:
 * resolve a company code to its branding, then log in with a
 * membership check. Both are unauthenticated at call time.
 */

export interface CompanyPortalContext {
  /** Company cuid — sent back at login as the membership anchor. */
  id: string;
  name: string;
  logoUrl: string | null;
  /** accessUntil still in the future. */
  active: boolean;
  accessUntil: string;
  /** The code the visitor actually typed (normalised), kept for the login step. */
  code: string;
}

export interface CorporateAuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
  mustResetPassword: boolean;
}

type Resolved =
  | { ok: true; company: CompanyPortalContext }
  | { ok: false; error: string };

export async function resolveCompanyCode(rawCode: string): Promise<Resolved> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter your company code.' };
  const res = await apiFetch('/companies/resolve', { method: 'POST', body: JSON.stringify({ code }) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? "We couldn't check that code. Try again." };
  }
  const company = (await res.json()) as Omit<CompanyPortalContext, 'code'>;
  return { ok: true, company: { ...company, code } };
}

type LoggedIn =
  | { ok: true; user: CorporateAuthUser }
  | { ok: false; error: string };

export async function corporateLogin(email: string, password: string, companyCode: string): Promise<LoggedIn> {
  const res = await apiFetch('/auth/login/company', {
    method: 'POST',
    body: JSON.stringify({ email, password, companyCode }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? 'Something went wrong. Please try again.' };
  }
  return { ok: true, user: (await res.json()) as CorporateAuthUser };
}

// ─── Per-tab handoff between the code screen and the login screen ─────────
// sessionStorage, not a cookie: it's only UX context (which logo to show).
// The login call re-resolves `code` server-side, so tampering here changes
// nothing that matters.

const CTX_KEY = 'sypher_corp_ctx';

export function stashCompanyContext(ctx: CompanyPortalContext): void {
  try {
    sessionStorage.setItem(CTX_KEY, JSON.stringify(ctx));
  } catch {
    /* private mode / storage disabled — the login page falls back to a redirect */
  }
}

export function readCompanyContext(): CompanyPortalContext | null {
  try {
    const raw = sessionStorage.getItem(CTX_KEY);
    return raw ? (JSON.parse(raw) as CompanyPortalContext) : null;
  } catch {
    return null;
  }
}

export function clearCompanyContext(): void {
  try {
    sessionStorage.removeItem(CTX_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Where to land after a successful corporate login. The session cookie's
 * domain (COOKIE_DOMAIN) already covers both hosts, so this just needs the
 * main app's own URL — read from NEXT_PUBLIC_WEB_URL rather than derived
 * from the current (corporate) hostname, since the two hosts don't share a
 * predictable naming pattern across environments: local dev pairs two
 * subdomains (corporate.sypher.local / next.sypher.local), while production
 * pairs a subdomain with the bare apex (corporate.syphernext.com /
 * syphernext.com) — no single string-swap rule covers both.
 */
export function mainAppUrl(path = '/dashboard'): string {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://next.sypher.local';
  return `${base}${path}`;
}
