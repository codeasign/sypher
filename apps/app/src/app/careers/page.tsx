import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import JobList from '@/components/JobList';
import { getCachedOpenJobPosts } from '@/data/jobPostsCached';
import Footer from '@/components/Footer';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Open roles from companies hiring on Sypher.',
};

export default async function CareersIndexPage() {
  // Hiding the navbar link isn't enough -- a direct URL guess would still
  // reach this page, so gate it on the same toggle.
  if (process.env.NAVBAR_SHOW_CAREERS === 'false') {
    redirect('/');
  }

  const posts = await getCachedOpenJobPosts();

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Careers</h1>
            <p className={styles.pageSubtitle}>Open roles from companies hiring on Sypher.</p>
          </div>
          <JobList initialPosts={posts} />
        </div>
      </div>
      <Footer />
    </>
  );
}
