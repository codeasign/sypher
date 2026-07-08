import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './legal.module.css';

export default function PrivacyPolicy() {
  return (
    <Layout
      title="Privacy Policy"
      description="Sypher's Privacy Policy — how we collect, use, and protect your information."
    >
      <main className={styles.page}>
        <div className={styles.container}>
          <Heading as="h1" className={styles.title}>Privacy Policy</Heading>
          <p className={styles.updated}>Last updated: TODO</p>

          <p className={styles.text}>
            This page is a placeholder for Sypher's Privacy Policy. Final content
            describing how we collect, use, store, and protect your information
            will be published here.
          </p>

          <p className={styles.text}>
            If you have questions about our privacy practices in the meantime,
            please contact us through the channels listed on our site.
          </p>
        </div>
      </main>
    </Layout>
  );
}
