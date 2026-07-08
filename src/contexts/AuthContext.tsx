import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  session: null,
  user: null,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
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
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
