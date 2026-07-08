import React, { useState } from 'react';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './OAuthButtons.module.css';

export default function OAuthButtons({
  onError,
  redirectTo = '/dashboard',
}: {
  onError: (message: string) => void;
  redirectTo?: string;
}): JSX.Element {
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn(): Promise<void> {
    if (!supabase) {
      onError('Auth is not configured. Check Supabase environment variables.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) {
      onError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.oauthButton}
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
    </div>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.85.87-3.06.87-2.36 0-4.36-1.6-5.08-3.75H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.92 10.68A5.4 5.4 0 0 1 3.64 9c0-.58.1-1.15.28-1.68V4.99H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.01l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.99l2.97 2.33C4.64 5.17 6.64 3.58 9 3.58z" />
    </svg>
  );
}
