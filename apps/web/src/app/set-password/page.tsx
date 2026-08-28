'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from '../reset-password/styles.module.css';

// Forced first-login screen. Reached when the signed-in user's
// `mustResetPassword` flag is set (admin created their account with a
// temporary password). Uses the session — no token — via
// POST /auth/set-password.
export default function SetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Guard: only for a signed-in user who actually needs this.
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { mustResetPassword?: boolean } | null) => {
        if (!me) {
          router.replace('/login');
          return;
        }
        if (!me.mustResetPassword) {
          router.replace('/dashboard');
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (pw !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await apiFetch('/auth/set-password', { method: 'POST', body: JSON.stringify({ newPassword: pw }) });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? 'Could not set your password.');
      return;
    }
    router.replace('/dashboard');
  }

  if (!ready) return <div className={styles.page} aria-busy="true" />;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          Sypher
        </div>
        <h1 className={styles.title}>Choose your password</h1>
        <p className={styles.subtitle}>
          Your account was set up for you. Pick your own password (at least 8 characters) to finish.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="pw">New password</label>
            <input
              id="pw"
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
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
          <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.82rem', marginBottom: '1rem' }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show passwords
          </label>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
