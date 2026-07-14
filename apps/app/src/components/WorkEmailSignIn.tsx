'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './WorkEmailSignIn.module.css';

export default function WorkEmailSignIn({
  redirectTo = '/dashboard',
}: {
  redirectTo?: string;
}): React.JSX.Element {
  const { signInWithWorkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'sent' | 'not_recognized' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus('checking');
    const { error, status: resultStatus } = await signInWithWorkEmail(email, redirectTo);

    if (error) {
      setStatus('error');
      setErrorMessage(error);
      return;
    }

    setStatus(resultStatus);
  }

  if (status === 'sent') {
    return <p className={styles.message}>Check your email for a sign-in link.</p>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.fieldLabel} htmlFor="work-email">
        Work or school email
      </label>
      <input
        id="work-email"
        type="email"
        className={styles.input}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setStatus('idle');
        }}
        placeholder="you@company.com"
        required
        disabled={status === 'checking'}
      />

      {status === 'not_recognized' && (
        <p className={styles.notRecognized}>
          This email isn&apos;t recognized. Ask your admin for an invite, or use the Individual tab.
        </p>
      )}

      {status === 'error' && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={status === 'checking' || !email.trim()}>
        {status === 'checking' ? 'Checking…' : 'Send magic link'}
      </button>
    </form>
  );
}
