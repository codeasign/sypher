import { useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { useAuth } from '@site/src/contexts/AuthContext';
import { setAnalyticsUser, trackPageView, trackEvent } from '@site/src/lib/analytics';

// Mounted once in Root. Docusaurus's client-side router doesn't do full page
// reloads on navigation, so gtag's own auto page_view (never enabled here --
// there's no send_page_view:true call in the bootstrap) would only ever fire
// once on initial load -- this fires one per route change instead, and keeps
// GA4's user_id/role user-property in sync with whatever useAuth() currently
// resolves to. Docs has no signup/login flow of its own (see AuthContext.tsx
// comment), so unlike apps/app's AnalyticsSession there's no
// signup_completed handling here.
export default function AnalyticsSession(): null {
  const location = useLocation();
  const { user, role, loading } = useAuth();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setAnalyticsUser(user?.id ?? null, role);
  }, [loading, user?.id, role]);

  useEffect(() => {
    if (location.pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = location.pathname;
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Delegated listener rather than swizzling DocSidebarItem/Link -- the
  // sidebar re-renders per route/course, but this listens on the stable
  // sidebar container so it doesn't need to be re-attached on navigation.
  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const link = target.closest('.theme-doc-sidebar-container a.menu__link');
      if (!link) return;
      trackEvent('course_sidebar_nav_click', {
        href: link.getAttribute('href') ?? '',
        label: link.textContent?.trim() ?? '',
      });
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
