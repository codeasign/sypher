import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getOwnProfile } from '@site/src/data/profiles';
import type { Role } from '@site/src/types/roles';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  session: null,
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { supabaseUrl, supabaseAnonKey } = (siteConfig.customFields ?? {}) as {
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
        'Missing Supabase config: set SUPABASE_URL and SUPABASE_ANON_KEY in .env and restart the dev server.'
      );
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUrl, supabaseAnonKey]);

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function applySession(newSession: Session | null): Promise<void> {
      if (newSession) {
        const profile = await getOwnProfile(supabase, newSession.user.id);
        if (profile?.deleted_at) {
          await supabase.auth.signOut();
          if (isMounted) {
            setSession(null);
            setRole(null);
          }
          return;
        }
        if (isMounted) {
          setRole((profile?.role as Role) ?? null);
        }
      } else if (isMounted) {
        setRole(null);
      }
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    supabase,
    session,
    user: session?.user ?? null,
    role,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
