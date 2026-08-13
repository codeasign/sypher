'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { WORK_MODE_LABEL } from '@/types/workMode';
import { useShowMore } from '@/hooks/useShowMore';
import styles from './styles.module.css';

interface JobSummary {
  slug: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string | null;
  work_mode: string | null;
  created_at: string;
}

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

// Explicit locale -- see BlogList/index.tsx for why `undefined` would cause
// a server/client hydration mismatch in this Client Component.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Deterministic per-company avatar color so the same company always gets the
// same tint across renders/tabs, without needing a stored color field.
function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 58%, 42%)`;
}

// Seeds from the server-rendered `initialPosts`. On any job_posts change,
// hits /api/careers/live-refresh -- which revalidates the shared 'careers'
// cache tag and returns the fresh list -- instead of running its own raw
// Supabase query, so N open tabs share one cache repopulation rather than
// issuing N parallel queries.
export default function JobList({ initialPosts }: { initialPosts: JobSummary[] }) {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<JobSummary[]>(initialPosts);

  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('job_posts_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posts' }, () => {
        fetch('/api/careers/live-refresh', { method: 'POST' })
          .then((res) => res.json())
          .then((data) => setPosts(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const { visible, hasMore, showAll } = useShowMore(posts);

  if (posts.length === 0) {
    return <p className={styles.statusText}>No open roles right now. Check back soon.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {posts.length} open {posts.length === 1 ? 'role' : 'roles'}
      </span>
      <div className={styles.list}>
        {visible.map((post) => (
          <Link key={post.slug} href={`/careers/${post.slug}`} className={styles.row}>
            <div className={styles.avatar} style={{ background: companyColor(post.company_name) }}>
              {post.company_name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.rowBody}>
              <div className={styles.rowTop}>
                <h3 className={styles.title}>{post.title}</h3>
                <span className={styles.postedDate}>Posted on: {formatDate(post.created_at)}</span>
              </div>
              <p className={styles.company}>
                {post.company_name}
                {post.location && (
                  <>
                    <span className={styles.companyDot}>&middot;</span>
                    <span className={styles.location}>{post.location}</span>
                  </>
                )}
              </p>
              <div className={styles.badges}>
                {post.employment_type && (
                  <span className={styles.badge}>
                    {EMPLOYMENT_TYPE_LABEL[post.employment_type] ?? post.employment_type}
                  </span>
                )}
                {post.work_mode && (
                  <span className={styles.badge}>
                    {WORK_MODE_LABEL[post.work_mode] ?? post.work_mode}
                  </span>
                )}
              </div>
            </div>
            <span className={styles.chevron} aria-hidden="true">
              &rsaquo;
            </span>
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
