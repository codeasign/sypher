'use client';

import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { usePaginatedListView } from '@/hooks/usePaginatedListView';
import { ListViewToolbar } from '@/components/ListViewToolbar';
import Pagination from '@/components/Pagination';
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

// Seeded from the server-rendered `initialPosts` (page 1, summary fields
// only — no live-refresh subscription; the old version used a Supabase
// realtime channel, apps/web has no Supabase client at all). Page-based
// navigation (Previous/Next + page numbers) fetches exactly one page from
// the API rather than sending every post's full row (previously including
// the whole markdown body) on first load. Each page response is itself
// cache-backed on the API for PUBLIC_CACHE_TTL_MS and purged on any write
// (see BlogController).
export default function BlogList({
  initialPosts,
  total,
  pageSize,
}: {
  initialPosts: PostSummary[];
  total: number;
  pageSize: number;
}) {
  const { items: posts, total: liveTotal, page, totalPages, loading, loadError, goToPage, viewMode, setViewMode } = usePaginatedListView({
    initialItems: initialPosts,
    total,
    pageSize,
    storageKey: 'blog-view-mode',
    defaultView: 'list',
    fetchPage: async (limit, offset) => {
      const res = await apiFetch(`/blog?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      const page: { posts: PostSummary[]; total: number } = await res.json();
      return { items: page.posts, total: page.total };
    },
  });

  if (liveTotal === 0) {
    return <p className={styles.statusText}>No posts published yet. Check back soon.</p>;
  }

  return (
    <>
      <ListViewToolbar
        shown={posts.length}
        total={liveTotal}
        itemLabelSingular="post"
        itemLabelPlural="posts"
        viewMode={viewMode}
        onChangeView={setViewMode}
        ariaLabel="Post display"
      />

      {viewMode === 'card' ? (
        <div className={styles.grid}>
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
              {post.coverImageUrl ? (
                <img src={post.coverImageUrl} alt={post.title} className={styles.cardImage} />
              ) : (
                <div className={styles.cardImagePlaceholder} style={{ background: titleColor(post.title) }}>
                  {post.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                {post.description && <p className={styles.cardDescription}>{post.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {posts.map((post) => (
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
      )}

      {loadError && <p className={styles.loadErrorText}>{loadError}</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />
    </>
  );
}
