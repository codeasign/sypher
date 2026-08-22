'use client';

import Link from 'next/link';
import { useShowMore } from '@/hooks/useShowMore';
import styles from './styles.module.css';

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

function titleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 58%, 42%)`;
}

// Seeded from the server-rendered `initialPosts` — no live-refresh
// subscription (the old version used a Supabase realtime channel; apps/web
// has no Supabase client at all). A page reload picks up new posts, same as
// any other apps/web page — cache purge-on-write (apps/api's /blog cache)
// means that's always fresh, not stale for up to a TTL.
export default function BlogList({ initialPosts }: { initialPosts: PostSummary[] }) {
  const { visible, hasMore, showAll } = useShowMore(initialPosts);

  if (initialPosts.length === 0) {
    return <p className={styles.statusText}>No posts published yet. Check back soon.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {initialPosts.length} {initialPosts.length === 1 ? 'post' : 'posts'}
      </span>
      <div className={styles.list}>
        {visible.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.row}>
            <div className={styles.avatar} style={{ background: titleColor(post.title) }}>
              {post.title.charAt(0).toUpperCase()}
            </div>
            <div className={styles.rowBody}>
              <div className={styles.rowTop}>
                <h3 className={styles.title}>{post.title}</h3>
              </div>
              {post.description && <p className={styles.description}>{post.description}</p>}
            </div>
          </Link>
        ))}
      </div>
      {hasMore && (
        <div className={styles.showMoreWrap}>
          <button type="button" className={styles.showMoreBtn} onClick={showAll}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}
