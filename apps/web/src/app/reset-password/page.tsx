'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './styles.module.css';

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

function ResetPasswordForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? 'That link is invalid or has expired. Ask for a new one.');
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          Sypher
        </div>
        <h1 className={styles.title}>Link incomplete</h1>
        <p className={styles.subtitle}>
          This page needs the full link from your email. Open it again, or request a new one.
        </p>
        <Link href="/forgot-password" className={styles.link}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.card}>
        <div className={styles.successMark} aria-hidden="true">
          &#10003;
        </div>
        <h1 className={styles.title}>Password set</h1>
        <p className={styles.subtitle}>
          You can now sign in. Company members: head to your company portal; everyone else, the main
          sign-in.
        </p>
        <Link href="/login" className={styles.submitBtn} style={{ display: 'block', textAlign: 'center', lineHeight: '2.9rem', textDecoration: 'none' }}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <span className={styles.brandDot} />
        Sypher
      </div>
      <h1 className={styles.title}>Set your password</h1>
      <p className={styles.subtitle}>Choose a password of at least 8 characters.</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="newPassword">New password</label>
          <div className={styles.passwordWrap}>
            <input
              id="newPassword"
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
