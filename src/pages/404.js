import { useEffect } from 'react';
import Layout from '@theme/Layout';

export default function NotFound() {
  useEffect(() => {
    window.location.href = '/';
  }, []);

  return (
    <Layout title="Page Not Found">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <h1 style={{ fontSize: '4rem', margin: '0', color: 'var(--ifm-color-primary)' }}>404</h1>
        <p>Redirecting to homepage...</p>
      </div>
    </Layout>
  );
}
