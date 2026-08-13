'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useShowMore } from '@/hooks/useShowMore';
import styles from './styles.module.css';

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  published_at: string | null;
  cover_image_url: string | null;
}

// Deterministic per-post avatar color so the same title always gets the same
// tint across renders/tabs, without needing a stored color field.
function titleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 58%, 42%)`;
}

// Seeds from the server-rendered `initialPosts` (real SEO/link-preview
// HTML). On any blog_posts change, hits /api/blog/live-refresh -- which
// revalidates the shared 'blog' cache tag and returns the fresh list --
// instead of running its own raw Supabase query, so N open tabs share one
// cache repopulation rather than issuing N parallel queries.
export default function BlogList({ initialPosts }: { initialPosts: PostSummary[] }) {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<PostSummary[]>(initialPosts);

  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel('blog_posts_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => {
        fetch('/api/blog/live-refresh', { method: 'POST' })
          .then((res) => res.json())
          .then((data) => setPosts(data));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const { visible, hasMore, showAll } = useShowMore(posts);

  if (posts.length === 0) {
    return <p className={styles.statusText}>No posts published yet. Check back soon.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
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
