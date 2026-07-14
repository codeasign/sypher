import type { Metadata } from 'next';
import BlogList from '@/components/BlogList';
import { getCachedPublishedBlogPosts } from '@/data/blogPostsCached';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest articles and updates from the Sypher team.',
};

export default async function BlogIndexPage() {
  const posts = await getCachedPublishedBlogPosts();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Blog</h1>
          <p className={styles.pageSubtitle}>Latest articles and updates from the Sypher team.</p>
        </div>
        <BlogList initialPosts={posts} />
      </div>
    </div>
  );
}
