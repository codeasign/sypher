import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import OAuthButtons from '@site/src/components/OAuthButtons';
import RedirectIfAuthed from '@site/src/components/RedirectIfAuthed';
import { getSafeRedirect } from '@site/src/utils/safeRedirect';
import styles from './auth.module.css';

function LoginForm(): JSX.Element {
  const [errorMessage, setErrorMessage] = useState('');

  const redirectTarget = getSafeRedirect(
    new URLSearchParams(window.location.search).get('redirect')
  );

  return (
    <div className={styles.card}>
      <h1 className={styles.heading}>Log in</h1>

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
        Need an account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <Layout title="Log In" description="Log in to your Sypher account">
      <main className={styles.wrapper}>
        <RedirectIfAuthed>
          <BrowserOnly fallback={<div>Loading…</div>}>{() => <LoginForm />}</BrowserOnly>
        </RedirectIfAuthed>
      </main>
    </Layout>
  );
}
