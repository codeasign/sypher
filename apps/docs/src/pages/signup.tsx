import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import OAuthButtons from '@site/src/components/OAuthButtons';
import RedirectIfAuthed from '@site/src/components/RedirectIfAuthed';
import { getSafeRedirect } from '@site/src/utils/safeRedirect';
import styles from './auth.module.css';

function SignUpForm(): JSX.Element {
  const [errorMessage, setErrorMessage] = useState('');

  const redirectTarget = getSafeRedirect(
    new URLSearchParams(window.location.search).get('redirect')
  );

  return (
    <div className={styles.card}>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subhead}>Start your first free lesson in under a minute.</p>

      <OAuthButtons
        redirectTo={redirectTarget}
        onError={(message) => setErrorMessage(message)}
      />

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <p className={styles.altAction}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}

export default function SignUpPage(): JSX.Element {
  return (
    <Layout title="Sign Up" description="Create your Sypher account">
      <main className={styles.wrapper}>
        <RedirectIfAuthed>
          <BrowserOnly fallback={<div>Loading…</div>}>{() => <SignUpForm />}</BrowserOnly>
        </RedirectIfAuthed>
      </main>
    </Layout>
  );
}
