import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getAppSignupUrl } from '@sypher/auth-core/src/urls';
import { getSafeRedirect } from '@site/src/utils/safeRedirect';

// Docs never shows its own signup form -- app.sypher.local is the only place
// signup happens (see apps/app/src/app/signup/page.tsx). This just bounces
// straight there, carrying along any ?redirect= target.
function RedirectToAppSignup(): JSX.Element {
  useEffect(() => {
    const redirectTarget = getSafeRedirect(
      new URLSearchParams(window.location.search).get('redirect')
    );
    window.location.href = getAppSignupUrl(redirectTarget);
  }, []);

  return <p role="status">Redirecting to sign up…</p>;
}

export default function SignUpPage(): JSX.Element {
  return (
    <Layout title="Sign Up" description="Create your Sypher account">
      <main>
        <BrowserOnly fallback={<p role="status">Loading…</p>}>
          {() => <RedirectToAppSignup />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
