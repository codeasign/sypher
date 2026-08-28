'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearCompanyContext,
  corporateLogin,
  mainAppUrl,
  readCompanyContext,
  type CompanyPortalContext,
} from '@/data/corporate';
import styles from '../styles.module.css';

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

// Step 2 of the corporate portal: the company is already known (branding
// comes from the code screen's stashed context). Auth goes through
// POST /auth/login/company, which re-checks the code, the credentials,
// company membership AND the access window before it will set a session.
export default function CorporateLoginPage(): React.JSX.Element {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyPortalContext | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ctx = readCompanyContext();
    if (!ctx) {
      router.replace('/corporate');
      return;
    }
    setCompany(ctx);
    setReady(true);
  }, [router]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!company) return;
    setSubmitting(true);
    setError(null);

    const result = await corporateLogin(email, password, company.code);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    clearCompanyContext();
    // Provisioned account with a temporary password → force a change first
    // (set-password lives in the main app).
    if (result.user.mustResetPassword) {
      window.location.href = mainAppUrl('/set-password');
      return;
    }
    if (result.user.role === 'COMPANY_HR') {
      // The company admin stays on the portal — their console lives here.
      router.push('/corporate/admin');
      return;
    }
    // Everyone else goes to the main app. The session cookie is on
    // .sypher.local, so a hard nav carries it over (a client push would
    // stay on the corporate host).
    window.location.href = mainAppUrl('/dashboard');
  }

  if (!ready || !company) {
    return <div className={styles.page} aria-busy="true" />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.companyBrand}>
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.companyLogo} src={company.logoUrl} alt={`${company.name} logo`} />
          ) : (
            <span className={styles.companyLogoFallback} aria-hidden="true">
              {company.name.charAt(0)}
            </span>
          )}
          <span className={styles.companyName}>{company.name}</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Use your {company.name} Sypher account.</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className={styles.backLink}
          onClick={() => {
            clearCompanyContext();
            router.push('/corporate');
          }}
        >
          ‹ Use a different company code
        </button>

        <p className={styles.poweredBy}>Powered by Sypher</p>
      </div>
    </div>
  );
}
