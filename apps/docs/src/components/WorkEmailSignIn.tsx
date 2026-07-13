import React, { useState } from 'react';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './WorkEmailSignIn.module.css';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function WorkEmailSignIn({
  redirectTo = '/dashboard',
}: {
  redirectTo?: string;
}): JSX.Element {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'sent' | 'not_recognized' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!supabase) {
      setStatus('error');
      setErrorMessage('Auth is not configured. Check Supabase environment variables.');
      return;
    }

    const normalized = normalizeEmail(email);
    if (!normalized) return;

    setStatus('checking');

    const { data: isInvited, error: rpcError } = await supabase.rpc('email_is_invited', {
      check_email: normalized,
    });

    if (rpcError) {
      setStatus('error');
      setErrorMessage(rpcError.message);
      return;
    }

    if (!isInvited) {
      setStatus('not_recognized');
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
      },
    });

    if (otpError) {
      setStatus('error');
      setErrorMessage(otpError.message);
      return;
    }

    setStatus('sent');
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
