'use client';

import Link from 'next/link';
import { useShowMore } from '@/hooks/useShowMore';
import styles from './styles.module.css';

interface GettingStartedModule {
  id: string;
  slug: string;
  title: string;
  getting_started_order: number | null;
  course: { slug: string; status: string; name: string } | { slug: string; status: string; name: string }[];
}

// Deterministic per-module avatar color so the same title always gets the
// same tint across renders/tabs, without needing a stored color field.
function titleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 58%, 42%)`;
}

export default function GettingStartedModuleList({ modules }: { modules: GettingStartedModule[] }) {
  const { visible, hasMore, showAll } = useShowMore(modules);

  if (modules.length === 0) {
    return <p className={styles.statusText}>No getting-started guides published yet.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {modules.length} {modules.length === 1 ? 'guide' : 'guides'}
      </span>
      <div className={styles.list}>
        {visible.map((m) => {
          // Supabase's !inner embed types as an array in some client
          // versions, a single object in others -- normalize both.
          const course = Array.isArray(m.course) ? m.course[0] : m.course;
          if (!course) return null;
          return (
            <Link key={m.id} href={`/courses/${course.slug}/${m.slug}`} className={styles.row}>
              <div className={styles.avatar} style={{ background: titleColor(m.title) }}>
                {m.title.charAt(0).toUpperCase()}
              </div>
              <div className={styles.rowBody}>
                <h3 className={styles.title}>{m.title}</h3>
                <p className={styles.subtitle}>{course.name}</p>
              </div>
              <span className={styles.chevron} aria-hidden="true">
                &rsaquo;
              </span>
            </Link>
          );
        })}
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
