'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthUser } from '@/contexts/AuthUserContext';
import { setAnalyticsUser, trackEvent, trackPageView } from '@/lib/analytics';

// Mounted once in the root layout. Next.js App Router doesn't do full page
// reloads on navigation, so gtag's own auto page_view (disabled via
// send_page_view:false in AnalyticsBootstrap) would only ever fire once --
// this fires one per route change instead, and keeps GA4's user_id/role
// user-property in sync with whatever AuthUserProvider currently resolves
// to (null/'signed_out' on the corporate portal, which has its own session
// type that /auth/me doesn't recognize).
export default function AnalyticsSession(): null {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setAnalyticsUser(user?.id ?? null, user?.role ?? null);
  }, [loading, user?.id, user?.role]);

  useEffect(() => {
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  // AuthController's google/callback tags a brand-new account's redirect
  // with ?_signup=google -- the only reliable "just created via OAuth"
  // signal available, since email/password sign-up fires sign_up directly
  // from the login form instead. Fire once, then scrub the param so a
  // refresh doesn't double-count it.
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const method = params.get('_signup');
    if (!method) return;
    trackEvent('sign_up', { method });
    params.delete('_signup');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [loading, pathname, router]);

  return null;
}
