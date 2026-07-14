import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getAppOrigin } from '@sypher/auth-core/src/urls';

// app.sypher is the canonical homepage now -- docs' own marketing landing
// moved to apps/app/src/app/page.tsx. This just bounces straight there.
function RedirectToApp() {
  useEffect(() => {
    window.location.href = getAppOrigin();
  }, []);

  return <p role="status">Redirecting…</p>;
}

export default function Home() {
  return (
    <Layout title="Sypher" description="Learn AI Engineering & System Design">
      <main>
        <BrowserOnly fallback={<p role="status">Loading…</p>}>
          {() => <RedirectToApp />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
