import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { AUTH_COOKIE_OPTIONS } from '@sypher/auth-core/src/cookieConfig';
import { getAppLoginUrl } from '@sypher/auth-core/src/urls';

// Vercel Routing Middleware for apps/docs (a separate, non-Next.js Vercel
// project from apps/app — this file is unrelated to apps/app's proxy.ts).
// apps/docs is a pure static export with no server in its own request
// path: the only access check used to be DocRoot's client-side useEffect,
// which runs *after* the page (and, worse, the globally-public main.js
// chunk registry) already exposed premium lesson content. This middleware
// is now the actual enforcement boundary, gating both:
//   1. /docs/<slug>/** page routes
//   2. /assets/js/course-<slug>.*.js — the per-course chunk isolated by
//      plugins/course-chunk-isolation, so a premium chunk can't be
//      downloaded directly even if its filename is parsed out of main.js.
//
// Course slugs are never hardcoded here — check_course_access resolves
// access dynamically against `course_access`, so a brand-new course is
// covered the moment its docs folder + chunk-isolation rule exist, with
// zero changes to this file.
export const config = {
  matcher: ['/docs/:slug/:path*', '/assets/js/:file(course-.*)'],
};

// Matches only the exact course-<slug>.<hash>.js shape Docusaurus emits for
// an isolated course chunk. Any other file under /assets/js/course-* (e.g. a
// future *.js.map or *.js.LICENSE.txt sibling) must NOT fall through to the
// "not a gated path" branch below — see isChunkRequest handling.
const COURSE_CHUNK_RE = /^\/assets\/js\/course-(.+?)\.[^/.]+\.js$/;

function extractCourseSlug(pathname: string): string | null {
  if (pathname.startsWith('/docs/')) {
    const segment = pathname.split('/').filter(Boolean)[1];
    return segment ?? null;
  }
  const chunkMatch = pathname.match(COURSE_CHUNK_RE);
  return chunkMatch ? chunkMatch[1] : null;
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // The matcher (config.matcher above) already scopes this middleware to
  // /docs/** and /assets/js/course-** — anything under the latter that
  // isn't the exact chunk shape must be denied, not allowed through, or a
  // sibling asset (source map, license file, etc.) would bypass gating.
  const isChunkRequest = url.pathname.startsWith('/assets/js/course-');
  const slug = extractCourseSlug(url.pathname);
  if (!slug) {
    return isChunkRequest ? new Response('Forbidden', { status: 403 }) : undefined;
  }

  const denyUnauthenticated = () =>
    isChunkRequest ? new Response('Forbidden', { status: 403 }) : Response.redirect(getAppLoginUrl(url.pathname), 302);
  const denyUnauthorized = () =>
    isChunkRequest ? new Response('Forbidden', { status: 403 }) : Response.redirect(new URL('/', url.origin), 302);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail closed — an unconfigured project must never serve gated content.
    return denyUnauthenticated();
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader).filter(
          (cookie): cookie is { name: string; value: string } => cookie.value !== undefined,
        );
      },
      setAll() {
        // Middleware only reads the session here; apps/app owns writing it.
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    return denyUnauthenticated();
  }

  const { data: allowed, error } = await supabase.rpc('check_course_access', {
    p_course_slug: slug,
  });
  if (error || !allowed) {
    return denyUnauthorized();
  }

  return undefined;
}
