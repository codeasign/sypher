'use client';

import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { usePaginatedListView } from '@/hooks/usePaginatedListView';
import { ListViewToolbar } from '@/components/ListViewToolbar';
import { CommentIcon } from '@/components/icons/ActionIcons';
import Pagination from '@/components/Pagination';
import styles from './styles.module.css';

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
  contentImage?: string | null;
  commentCount?: number;
}

// Centralized placeholder for image-less posts (cover and content both empty).
const PLACEHOLDER_IMAGE = '/blog-placeholder.svg';

function postImage(post: PostSummary): string {
  return post.coverImageUrl ?? post.contentImage ?? PLACEHOLDER_IMAGE;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
              <img src={postImage(post)} alt={post.title} className={styles.cardImage} loading="lazy" />
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                {post.description && <p className={styles.cardDescription}>{post.description}</p>}
                <div className={styles.cardMeta}>
                  {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                  {post.commentCount != null && (
                    <span className={styles.metaItem}>
                      <CommentIcon />
                      {post.commentCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.row}>
              <img src={postImage(post)} alt={post.title} className={styles.rowThumb} loading="lazy" />
              <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                  <h3 className={styles.title}>{post.title}</h3>
                  <span className={styles.rowMeta}>
                    {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                    {post.commentCount != null && (
                      <span className={styles.metaItem}>
                        <CommentIcon />
                        {post.commentCount}
                      </span>
                    )}
                  </span>
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
