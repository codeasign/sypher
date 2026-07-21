import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './legal.module.css';

export default function RefundPolicy() {
  return (
    <Layout
      title="Refund Policy"
      description="Sypher's Refund Policy — how refunds work for paid plans and purchases."
    >
      <main className={styles.page}>
        <div className={styles.container}>
          <Heading as="h1" className={styles.title}>Refund Policy</Heading>
          <p className={styles.updated}>Last updated: TODO</p>

          <p className={styles.text}>
            This page is a placeholder for Sypher's Refund Policy. Final content
            describing eligibility, timelines, and the process for requesting a
            refund on paid plans and purchases will be published here.
          </p>

          <p className={styles.text}>
            If you have questions about refunds in the meantime, please contact
            us through the channels listed on our site.
          </p>
        </div>
      </main>
    </Layout>
  );
}
