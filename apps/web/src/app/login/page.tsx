'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './styles.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api-next.sypher.local';

function EyeIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.4 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.4 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 36.1 27 37 24 37c-5.3 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 41.5 16.3 45 24 45Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.6 5.6C40.5 36.7 45 31.2 45 24c0-1.4-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

function AuthForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const endpoint = isSignUp ? '/auth/register' : '/auth/login';
    const body = isSignUp
      ? { email, password, fullName: `${firstName} ${lastName}`.trim() }
      : { email, password };
    const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (!res.ok) {
      const responseBody = await res.json().catch(() => ({}));
      setError(responseBody.message ?? 'Something went wrong');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <span className={styles.dots}>
            <span className={styles.dotActive} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </span>
          <h2 className={styles.leftTitle}>Learn by building.</h2>
          <p className={styles.leftSubtitle}>
            Hands-on, text-first courses built for real engineering growth — pick a track and start
            shipping.
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            Sypher Next
          </div>
          <h1 className={styles.greeting}>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First Name</label>
                  <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="lastName">Last Name</label>
                  <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className={styles.forgotRow}>
                <a href="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>
            )}

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Please wait…' : isSignUp ? 'Sign up' : 'Log in'}
            </button>
          </form>

          <p className={styles.toggleRow}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className={styles.toggleLink} onClick={() => setIsSignUp((s) => !s)}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <div className={styles.divider}>
            <span>Or continue with</span>
          </div>

          <a href={`${API_BASE_URL}/auth/google/start`} className={styles.googleBtn}>
            <GoogleIcon />
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
