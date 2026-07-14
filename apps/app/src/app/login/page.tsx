'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import OAuthButtons from '@/components/OAuthButtons';
import WorkEmailSignIn from '@/components/WorkEmailSignIn';
import RedirectIfAuthed from '@/components/RedirectIfAuthed';
import { getSafeRedirect } from '@/utils/safeRedirect';
import styles from '../auth.module.css';

function LoginForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'work'>('individual');
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirect(searchParams.get('redirect'));

  return (
    <div className={styles.card}>
      <h1 className={styles.heading}>Log in</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'individual' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('individual')}
        >
          Individual
        </button>
        <button
          type="button"
          className={activeTab === 'work' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('work')}
        >
          Work or School
        </button>
      </div>

      {activeTab === 'individual' ? (
        <>
          <OAuthButtons
            redirectTo={redirectTarget}
            onError={(message) => setErrorMessage(message)}
          />

          {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          )}
        </>
      ) : (
        <WorkEmailSignIn redirectTo={redirectTarget} />
      )}

      <p className={styles.altAction}>
        Need an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <main className={styles.wrapper}>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <RedirectIfAuthed>
          <LoginForm />
        </RedirectIfAuthed>
      </Suspense>
    </main>
  );
}
