'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

interface AuthUserContextValue {
  user: AuthUser | null;
  loading: boolean;
}

const AuthUserContext = createContext<AuthUserContextValue>({ user: null, loading: true });

// Single shared `/auth/me` fetch for the whole app -- mounted once in the
// root layout so Navbar and AnalyticsSession (and any future consumer) read
// one in-flight request instead of each firing their own. Promoted from
// Navbar's original component-owned fetch once AnalyticsSession became a
// second consumer of the same "am I logged in" state.
//
// Re-fetches on every route change, not just once on mount: the root
// layout does NOT remount on a client-side router.push() (e.g. the login
// form's redirect to /dashboard), so an empty dependency array would
// freeze this on whatever auth state was true when the layout first
// mounted and never notice a same-session login/logout that happened via
// client-side navigation instead of a full page load. `pathname` is a
// reliable proxy for "something navigation-worthy just happened."
export function AuthUserProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return <AuthUserContext.Provider value={{ user, loading }}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): AuthUserContextValue {
  return useContext(AuthUserContext);
}
