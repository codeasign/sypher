import type { Metadata } from 'next';
import BlogList from '@/components/BlogList';
import Footer from '@/components/Footer';
import { serverApiFetch } from '@/lib/serverApi';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest articles and updates from the Sypher team.',
};

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

export default async function BlogIndexPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/blog');
  const posts: PostSummary[] = res.ok ? await res.json() : [];

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>The Blog</span>
            <h1 className={styles.pageTitle}>Latest articles and updates</h1>
            <p className={styles.pageSubtitle}>Latest articles and updates from the Sypher team.</p>
          </div>
          <BlogList initialPosts={posts} />
        </div>
      </div>
      <Footer />
    </>
  );
}
