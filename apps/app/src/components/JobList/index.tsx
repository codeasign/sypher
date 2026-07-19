'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { WORK_MODE_LABEL } from '@/types/workMode';
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

  if (posts.length === 0) {
    return <p className={styles.statusText}>No open roles right now. Check back soon.</p>;
  }

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <Link key={post.slug} href={`/careers/${post.slug}`} className={styles.card}>
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>{post.title}</h3>
            <p className={styles.cardCompany}>{post.company_name}</p>
            <div className={styles.cardMeta}>
              {post.location && <span className={styles.metaBadge}>{post.location}</span>}
              {post.employment_type && (
                <span className={styles.metaBadge}>
                  {EMPLOYMENT_TYPE_LABEL[post.employment_type] ?? post.employment_type}
                </span>
              )}
              {post.work_mode && (
                <span className={styles.metaBadge}>
                  {WORK_MODE_LABEL[post.work_mode] ?? post.work_mode}
                </span>
              )}
            </div>
            <span className={styles.cardDate}>{formatDate(post.created_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
