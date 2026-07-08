---
description: Scaffold complete Supabase auth integration (signup, login, dashboard)
---

# Scaffold Supabase Auth

Creates every file required for Supabase email/password auth with a signup → dashboard
redirect flow. Idempotent — overwrites existing files at the exact paths below.

## Preconditions — verify before writing anything

1. Confirm `.env` exists at repo root with `SUPABASE_URL` and `SUPABASE_ANON_KEY` set.
   If missing, stop and ask the user for the values — never invent placeholder
   credentials or write a `.env` with fake keys.
2. Confirm `.env` is listed in `.gitignore`. If not, add it.
3. Confirm `@supabase/supabase-js` is in `package.json`. If not, run:
   ```
   npm install @supabase/supabase-js
   ```

## Files to create

### `src/contexts/AuthContext.tsx`
```tsx
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
```

### `src/theme/Root.tsx`
```tsx
import React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@site/src/contexts/AuthContext';

export default function Root({ children }: { children: ReactNode }): JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
```

### `src/components/RequireAuth.tsx`
```tsx
import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';

function RequireAuthInner({ children }: { children: ReactNode }): JSX.Element | null {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  if (loading) {
    return <p role="status">Checking your session…</p>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading…</p>}>
      {() => <RequireAuthInner>{children}</RequireAuthInner>}
    </BrowserOnly>
  );
}
```

### `src/pages/auth.module.css`
```css
.wrapper {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sy-paper);
  padding: var(--sy-space-3);
}

.card {
  width: 100%;
  max-width: 400px;
  background: var(--sy-paper-raised);
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-md);
  padding: var(--sy-space-4);
  display: flex;
  flex-direction: column;
}

.heading {
  font-family: var(--sy-font-display);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--sy-ink);
  margin: 0 0 0.4rem;
}

.subhead {
  font-family: var(--sy-font-body);
  color: var(--sy-text-muted);
  margin: 0 0 var(--sy-space-3);
}

.label {
  font-family: var(--sy-font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sy-text-muted);
  margin-bottom: 0.3rem;
  margin-top: var(--sy-space-2);
}

.input {
  font-family: var(--sy-font-body);
  font-size: 0.95rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-sm);
  background: var(--sy-paper);
  color: var(--sy-ink);
}

.input:focus-visible {
  outline: 2px solid var(--sy-brand);
  outline-offset: 1px;
}

.error {
  font-family: var(--sy-font-body);
  font-size: 0.85rem;
  color: #dc2626;
  margin: var(--sy-space-2) 0 0;
}

.submit {
  font-family: var(--sy-font-body);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.75rem;
  border: none;
  border-radius: var(--sy-radius-sm);
  background: var(--sy-brand);
  color: #ffffff;
  cursor: pointer;
  margin-top: var(--sy-space-3);
  transition: background-color 0.15s ease;
}

.submit:hover:not(:disabled) {
  background: var(--sy-ink);
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit:focus-visible {
  outline: 2px solid var(--sy-brand);
  outline-offset: 2px;
}

.altAction {
  font-family: var(--sy-font-body);
  font-size: 0.85rem;
  color: var(--sy-text-muted);
  text-align: center;
  margin: var(--sy-space-3) 0 0;
}

.altAction a {
  color: var(--sy-brand);
  font-weight: 600;
}
```

### `src/pages/signup.tsx`
```tsx
import React, { useState } from 'react';
import type { FormEvent } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './auth.module.css';

type Status = 'idle' | 'submitting' | 'check-email' | 'error';

function SignUpForm(): JSX.Element {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!supabase) {
      setStatus('error');
      setErrorMessage('Auth is not configured. Check Supabase environment variables.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled in Supabase Auth settings — session issued immediately.
      window.location.href = '/dashboard';
      return;
    }

    // Email confirmation is enabled — no session until the user clicks the confirmation link.
    setStatus('check-email');
  }

  if (status === 'check-email') {
    return (
      <div className={styles.card} role="status">
        <h1 className={styles.heading}>Check your email</h1>
        <p className={styles.subhead}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate
          your account, then log in.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subhead}>Start your first free lesson in under a minute.</p>

      <label className={styles.label} htmlFor="signup-email">
        Email
      </label>
      <input
        id="signup-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={styles.input}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label className={styles.label} htmlFor="signup-password">
        Password
      </label>
      <input
        id="signup-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        className={styles.input}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {status === 'error' && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Creating account…' : 'Sign up'}
      </button>

      <p className={styles.altAction}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </form>
  );
}

export default function SignUpPage(): JSX.Element {
  return (
    <Layout title="Sign Up" description="Create your Sypher account">
      <main className={styles.wrapper}>
        <BrowserOnly fallback={<div>Loading…</div>}>{() => <SignUpForm />}</BrowserOnly>
      </main>
    </Layout>
  );
}
```

### `src/pages/login.tsx`
```tsx
import React, { useState } from 'react';
import type { FormEvent } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './auth.module.css';

type Status = 'idle' | 'submitting' | 'error';

function LoginForm(): JSX.Element {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!supabase) {
      setStatus('error');
      setErrorMessage('Auth is not configured. Check Supabase environment variables.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.heading}>Log in</h1>

      <label className={styles.label} htmlFor="login-email">
        Email
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={styles.input}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label className={styles.label} htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={styles.input}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {status === 'error' && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Logging in…' : 'Log in'}
      </button>

      <p className={styles.altAction}>
        Need an account? <a href="/signup">Sign up</a>
      </p>
    </form>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <Layout title="Log In" description="Log in to your Sypher account">
      <main className={styles.wrapper}>
        <BrowserOnly fallback={<div>Loading…</div>}>{() => <LoginForm />}</BrowserOnly>
      </main>
    </Layout>
  );
}
```

### `src/pages/dashboard.module.css`
```css
.wrapper {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--sy-space-4) var(--sy-space-2);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sy-space-3);
}

.heading {
  font-family: var(--sy-font-display);
  font-size: 2rem;
  font-weight: 600;
  color: var(--sy-ink);
  margin: 0;
}

.logout {
  font-family: var(--sy-font-body);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.55rem 1rem;
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-sm);
  background: var(--sy-paper-raised);
  color: var(--sy-ink);
  cursor: pointer;
}

.logout:hover {
  border-color: var(--sy-brand);
  color: var(--sy-brand);
}

.logout:focus-visible {
  outline: 2px solid var(--sy-brand);
  outline-offset: 2px;
}

.welcome {
  font-family: var(--sy-font-body);
  color: var(--sy-text-muted);
  margin: 0;
}
```

### `src/pages/dashboard.tsx`
```tsx
import React from 'react';
import Layout from '@theme/Layout';
import RequireAuth from '@site/src/components/RequireAuth';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './dashboard.module.css';

function DashboardContent(): JSX.Element {
  const { user, supabase } = useAuth();

  async function handleLogout(): Promise<void> {
    await supabase?.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Dashboard</h1>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Log out
        </button>
      </div>
      <p className={styles.welcome}>Signed in as {user?.email}</p>
    </div>
  );
}

export default function DashboardPage(): JSX.Element {
  return (
    <Layout title="Dashboard" description="Your Sypher dashboard">
      <RequireAuth>
        <DashboardContent />
      </RequireAuth>
    </Layout>
  );
}
```

## Config wiring — merge, do not overwrite

`docusaurus.config.js` must have this as the very first line of the file:
```js
require('dotenv').config();
```

And this block inside the exported config object (merge with existing keys, do not
replace the whole object):
```js
customFields: {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
},
```

If `docusaurus.config.js` already has a `customFields` key, merge these two properties
into it rather than creating a duplicate key.

## After writing all files

1. Restart the dev server (env vars only load at boot):
   ```
   npm run start
   ```
2. Run `/verify-supabase-auth` to confirm wiring is correct before manual testing.