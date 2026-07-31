'use client';

import Link from 'next/link';
import { useShowMore } from '@/hooks/useShowMore';
import styles from '@/components/CardGrid/styles.module.css';

interface GettingStartedModule {
  id: string;
  slug: string;
  title: string;
  getting_started_order: number | null;
  course: { slug: string; status: string; name: string } | { slug: string; status: string; name: string }[];
}

export default function GettingStartedModuleList({ modules }: { modules: GettingStartedModule[] }) {
  const { visible, hasMore, showAll } = useShowMore(modules);

  if (modules.length === 0) {
    return <p className={styles.statusText}>No getting-started guides published yet.</p>;
  }

  return (
    <>
      <div className={styles.grid}>
        {visible.map((m) => {
          // Supabase's !inner embed types as an array in some client
          // versions, a single object in others -- normalize both.
          const course = Array.isArray(m.course) ? m.course[0] : m.course;
          if (!course) return null;
          return (
            <Link key={m.id} href={`/courses/${course.slug}/${m.slug}`} className={styles.card}>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{m.title}</h3>
                <p className={styles.cardSubtitle}>{course.name}</p>
              </div>
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
