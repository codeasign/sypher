'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './styles.module.css';

function EyeIcon(): React.JSX.Element {
  return (
    <Eye size={18} />
  );
}
function EyeOffIcon(): React.JSX.Element {
  return (
    <EyeOff size={18} />
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
