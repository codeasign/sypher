'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import OAuthButtons from '@/components/OAuthButtons';
import RedirectIfAuthed from '@/components/RedirectIfAuthed';
import { getSafeRedirect } from '@/utils/safeRedirect';
import { trackEvent } from '@/lib/analytics';
import styles from '../auth.module.css';

function SignUpForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState('');
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    trackEvent('signup_page_view', { referrer: typeof document !== 'undefined' ? document.referrer : '' });
  }, []);

  return (
    <div className={styles.card}>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subhead}>Start your first free lesson in under a minute.</p>

      <OAuthButtons
        redirectTo={redirectTarget}
        context="signup"
        onError={(message) => setErrorMessage(message)}
      />

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <p className={styles.altAction}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}

export default function SignUpPage(): React.JSX.Element {
  return (
    <main className={styles.wrapper}>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <RedirectIfAuthed>
          <SignUpForm />
        </RedirectIfAuthed>
      </Suspense>
    </main>
  );
}
