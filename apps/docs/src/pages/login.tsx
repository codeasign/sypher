import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getAppLoginUrl } from '@sypher/auth-core/src/urls';
import { getSafeRedirect } from '@site/src/utils/safeRedirect';

// Docs never shows its own login form -- app.sypher.local is the only place
// login happens (see apps/app/src/app/login/page.tsx). This just bounces
// straight there, carrying along any ?redirect= target.
function RedirectToAppLogin(): JSX.Element {
  useEffect(() => {
    const redirectTarget = getSafeRedirect(
      new URLSearchParams(window.location.search).get('redirect')
    );
    window.location.href = getAppLoginUrl(redirectTarget);
  }, []);

  return <p role="status">Redirecting to log in…</p>;
}

export default function LoginPage(): JSX.Element {
  return (
    <Layout title="Log In" description="Log in to your Sypher account">
      <main>
        <BrowserOnly fallback={<p role="status">Loading…</p>}>
          {() => <RedirectToAppLogin />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
