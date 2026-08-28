import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host-based routing for the corporate portal.
 *
 * corporate.sypher.local is the SAME apps/web deployment as
 * next.sypher.local (see Caddyfile). Requests to that host are sent into
 * the /corporate/* route tree so the portal gets its own URL space
 * without a second app or build. We REDIRECT (not rewrite) so the browser
 * URL, and therefore `usePathname()` everywhere, always matches the route
 * that renders — the Navbar keys off `/corporate` to hide itself.
 *
 * ── Portal-only enforcement hook (not built — decision 3, 2026-08-27) ──
 * If corporate accounts (COMPANY_EMPLOYEE / COMPANY_HR) must be FORCED
 * onto this host — i.e. blocked from signing in at next.sypher.local — the
 * check would live here: read the session cookie, look up the user, and
 * for a COMPANY_* role on a non-corporate host either 302 to
 * https://corporate.sypher.local or let a dedicated notice page render.
 * Deliberately left out: the real rules (block vs redirect, and how it
 * behaves for /reset-password links and the Google OAuth callback) aren't
 * defined yet. The API-side twins of this hook are commented in
 * apps/api AuthController's `login` and `googleCallback`.
 */

const CORPORATE_HOST_PREFIX = 'corporate.';

export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  const isCorporateHost = host.startsWith(CORPORATE_HOST_PREFIX);
  if (!isCorporateHost) return NextResponse.next();

  // Already in the portal tree — nothing to do.
  if (pathname === '/corporate' || pathname.startsWith('/corporate/')) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/corporate' : `/corporate${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and common static files; everything else on the
  // corporate host flows through the rewrite above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
