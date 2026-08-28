'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import styles from '../reset-password/styles.module.css';

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    const res = await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    setMessage(body.message ?? 'If an account exists for that email, a reset link has been sent.');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          Sypher
        </div>
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&rsquo;ll send a link to set a new password.
        </p>

        {message ? (
          <p role="status" className={styles.note}>
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className={styles.linkRow}>
          <Link href="/login" className={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
