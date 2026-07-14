import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@site/src/types/roles';

// TODO(Phase 5): AuthContext, courseAccess.js, companyAccess.js, useBookmarks.js
// and useDocBookmarks.js were moved to apps/app in Phase 3a. Docs no longer has
// its own Supabase client or session — Phase 5 will replace this stub with
// real read-only auth derived from a session cookie set by app.sypher (docs
// never signs users in directly). Until then every visitor renders as logged
// out.
interface AuthContextValue {
  supabase: null;
  user: null;
  role: Role | null;
  companyName: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  user: null,
  role: null,
  companyName: null,
  loading: false,
});

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthContext.Provider value={{ supabase: null, user: null, role: null, companyName: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
