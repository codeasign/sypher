import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { PublishedVideoSummary } from '@/data/videos';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Browse Videos',
  description: 'Watch standalone videos, grouped by category.',
};

const UNCATEGORIZED = 'More Videos';

function groupByCategory(videos: PublishedVideoSummary[]): Array<[string, PublishedVideoSummary[]]> {
  const map = new Map<string, PublishedVideoSummary[]>();
  for (const v of videos) {
    const key = v.category?.trim() || UNCATEGORIZED;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default async function BrowseVideosPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const res = await serverApiFetch('/videos');
  const videos: PublishedVideoSummary[] = res.ok ? await res.json() : [];
  const groups = groupByCategory(videos);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Browse Videos</h1>
        <p className={styles.pageSubtitle}>Watch standalone videos, grouped by category.</p>
      </div>

      {videos.length === 0 ? (
        <p className={styles.emptyText}>No videos published yet.</p>
      ) : (
        groups.map(([category, categoryVideos]) => (
          <section key={category} className={styles.categorySection}>
            <h2 className={styles.categoryHeading}>{category}</h2>
            <div className={styles.grid}>
              {categoryVideos.map((video) => (
                // Clicking opens the video's own page (user request
                // 2026-09-16 — reverted from an in-page modal), which
                // already has its own "← Back to videos" link pointing
                // here.
                <Link key={video.slug} href={`/videos/${video.slug}`} className={styles.card}>
                  <div className={styles.thumbnailWrap}>
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className={styles.thumbnail} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder} />
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{video.title}</h3>
                    {video.description && <p className={styles.cardDescription}>{video.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
