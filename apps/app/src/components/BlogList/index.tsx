'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { listPublishedBlogPosts } from '@/data/blogPosts';
import styles from './styles.module.css';

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  published_at: string | null;
  cover_image_url: string | null;
}

// Explicit locale ('en-IN', matching profile/page.tsx's date formatting) --
// `undefined` resolves to the runtime's default locale, which differs
// between the server (Node's ICU default) and the browser (navigator
// language), producing different text on each render and a hydration
// mismatch in this Client Component.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Seeds from the server-rendered `initialPosts` (real SEO/link-preview
// HTML), then re-queries on any blog_posts change so an open tab picks up
// new/edited/unpublished posts live -- RLS on the anon client already
// keeps this to published rows, so no extra filtering is needed here.
export default function BlogList({ initialPosts }: { initialPosts: PostSummary[] }) {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<PostSummary[]>(initialPosts);

  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('blog_posts_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => {
        listPublishedBlogPosts(supabase).then((data) => setPosts(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (posts.length === 0) {
    return <p className={styles.statusText}>No posts published yet. Check back soon.</p>;
  }

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt={post.title} className={styles.cardImage} />
          )}
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>{post.title}</h3>
            <p className={styles.cardDescription}>{post.description}</p>
            {post.published_at && <span className={styles.cardDate}>{formatDate(post.published_at)}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
