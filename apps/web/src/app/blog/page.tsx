import type { Metadata } from 'next';
import BlogList from '@/components/BlogList';
import Footer from '@/components/Footer';
import { serverApiFetch } from '@/lib/serverApi';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest articles and updates from the Sypher team.',
};

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

interface PublishedPostSummaryPage {
  posts: PostSummary[];
  total: number;
}

const PAGE_SIZE = 20;

export default async function BlogIndexPage(): Promise<React.JSX.Element> {
  // First page only (20 posts, summary fields) — BlogList fetches
  // subsequent pages itself on "Show more" rather than the server sending
  // every published post (and its full markdown body) on every load.
  const res = await serverApiFetch(`/blog?limit=${PAGE_SIZE}&offset=0`);
  const page: PublishedPostSummaryPage = res.ok ? await res.json() : { posts: [], total: 0 };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>The Blog</span>
            <h1 className={styles.pageTitle}>Latest articles and updates</h1>
            <p className={styles.pageSubtitle}>Latest articles and updates from the Sypher team.</p>
          </div>
          <BlogList initialPosts={page.posts} total={page.total} pageSize={PAGE_SIZE} />
        </div>
      </div>
      <Footer />
    </>
  );
}
