import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { AUTH_COOKIE_OPTIONS } from '@sypher/auth-core/src/cookieConfig';
import { getOwnRoleAndCompany } from '@site/src/data/profiles';
import type { Role } from '@site/src/types/roles';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  user: User | null;
  role: Role | null;
  companyName: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  user: null,
  role: null,
  companyName: null,
  loading: true,
});

// Reads the same Supabase session cookie app.sypher writes (shared
// AUTH_COOKIE_OPTIONS domain/name), so a user logged in on app.sypher.local
// shows as logged in here too. Docs never calls signIn*/signUp/signOut --
// login and logout only happen on app.sypher (see LoginNavbarItem.js,
// pages/login.tsx, pages/signup.tsx). The client exposed here is for reading
// session state and querying public course-access tables, not for
// initiating auth.
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { supabaseUrl, supabaseAnonKey } = siteConfig.customFields as {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };

  const supabase = useMemo<SupabaseClient | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      // eslint-disable-next-line no-console
      console.error(
        'Missing Supabase config: set SUPABASE_URL and SUPABASE_ANON_KEY in apps/docs/.env and restart the dev server.'
      );
      return null;
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey, { cookieOptions: AUTH_COOKIE_OPTIONS });
  }, [supabaseUrl, supabaseAnonKey]);

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    let currentUserId: string | null = null;

    async function applySession(newSession: Session | null): Promise<void> {
      if (newSession) {
        const profile = await getOwnRoleAndCompany(supabase, newSession.user.id);
        if (isMounted) {
          setRole((profile.role as Role) ?? null);
          setCompanyName(profile.companyName);
        }
      } else if (isMounted) {
        setRole(null);
        setCompanyName(null);
      }
      currentUserId = newSession?.user.id ?? null;
      if (isMounted) {
        setSession(newSession);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session).finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED' && (newSession?.user.id ?? null) === currentUserId) {
        if (isMounted) {
          setSession(newSession);
        }
        return;
      }
      applySession(newSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    supabase,
    user: session?.user ?? null,
    role,
    companyName,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
