'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { setAnalyticsUser, trackPageView, trackEvent } from '@/lib/analytics';

// Mounted once in the root layout. Next.js App Router doesn't do full page
// reloads on navigation, so gtag's own auto page_view (disabled via
// send_page_view:false in AnalyticsBootstrap) would only ever fire once --
// this fires one per route change instead, and keeps GA4's user_id/role
// user-property in sync with whatever useAuth() currently resolves to.
export default function AnalyticsSession(): null {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signupSource, loading } = useAuth();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setAnalyticsUser(user?.id ?? null, role);
  }, [loading, user?.id, role]);

  useEffect(() => {
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  // auth/callback/route.ts tags a brand-new account's post-login redirect
  // with ?_signup=1 (the only reliable "just created" signal available,
  // since OAuth/magic-link both land here whether the account is new or
  // returning). Fire once, then scrub the param so a refresh doesn't
  // double-count it.
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('_signup') !== '1') return;
    trackEvent('signup_completed', { signup_source: signupSource ?? 'unknown' });
    params.delete('_signup');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [loading, pathname, signupSource, router]);

  return null;
}
