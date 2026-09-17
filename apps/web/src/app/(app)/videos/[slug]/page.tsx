import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { PublishedVideoSummary, Video } from '@/data/videos';
import DiscussionSection from '@/components/DiscussionSection';
import VideoPlayer from '@/components/VideoPlayer';
import styles from './styles.module.css';

// Resources are uploaded zips (Bunny URLs), not free text, but rendering
// a stored url straight into href is still worth guarding — a
// javascript:/data: scheme there would execute on click (XSS via stored
// resource URL). Only http(s) passes; anything else renders inert.
function safeUrl(raw: string): string {
  try {
    const parsed = new URL(raw, 'https://x/');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? raw : '#';
  } catch {
    return '#';
  }
}

async function fetchVideo(slug: string): Promise<{ video: Video | null; unauthenticated: boolean }> {
  const res = await serverApiFetch(`/videos/${encodeURIComponent(slug)}`);
  if (res.status === 401) return { video: null, unauthenticated: true };
  if (res.status === 404) return { video: null, unauthenticated: false };
  if (!res.ok) throw new Error(`Could not load video (${res.status})`);
  return { video: await res.json(), unauthenticated: false };
}

async function fetchAllVideos(): Promise<PublishedVideoSummary[]> {
  const res = await serverApiFetch('/videos');
  return res.ok ? res.json() : [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { video } = await fetchVideo(slug);
  if (!video) return {};
  return { title: video.title, description: video.description ?? undefined };
}

export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const [{ video, unauthenticated }, allVideos] = await Promise.all([fetchVideo(slug), fetchAllVideos()]);
  if (unauthenticated) redirect('/login');
  // GET /videos/{slug} already only returns published + uploaded videos
  // (and never sends videoUrl — see VideoController.getBySlug) — a
  // non-null response here IS the gate.
  if (!video) notFound();

  // Playlist rail (user request 2026-09-16: "YouTube-like UI with
  // Playlist") — same-category videos first (most relevant "up next"),
  // then everything else, current video excluded. Falls back to the full
  // list when this video has no category.
  const others = allVideos.filter((v) => v.slug !== video.slug);
  const sameCategory = video.category ? others.filter((v) => v.category === video.category) : [];
  const rest = others.filter((v) => !sameCategory.includes(v));
  const playlist = [...sameCategory, ...rest];

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.main}>
          {/* Sticky player block (user request 2026-09-16: "video remains
              on screen and user just scrolls down the playlist videos")
              — pinned near the top while transcript/resources/comments
              below scroll underneath it, same top offset as the sticky
              playlist rail so both stay visually aligned together. */}
          <div className={styles.stickyPlayer}>
            <Link href="/browse-videos" className={styles.backLink}>
              ← Back to videos
            </Link>

            <h1 className={styles.title}>{video.title}</h1>
            {video.description && <p className={styles.description}>{video.description}</p>}

            <VideoPlayer slug={video.slug} />
          </div>

          {video.transcript && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Transcript</h2>
              <div className={styles.transcript}>{video.transcript}</div>
            </section>
          )}

          {video.resources && video.resources.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Resources</h2>
              <ul className={styles.resourceList}>
                {video.resources.map((res, i) => (
                  <li key={i}>
                    <a href={safeUrl(res.url)} className={styles.resourceLink} target="_blank" rel="noopener noreferrer">
                      {res.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <DiscussionSection targetType="video" targetId={video.id} badgeLabel="Creator" />
          </section>
        </div>

        {playlist.length > 0 && (
          <aside className={styles.playlist} aria-label="More videos">
            <h2 className={styles.playlistHeading}>Up next</h2>
            <div className={styles.playlistItems}>
              {playlist.map((v) => (
                <Link key={v.slug} href={`/videos/${v.slug}`} className={styles.playlistItem}>
                  <div className={styles.playlistThumbWrap}>
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnailUrl} alt="" className={styles.playlistThumb} />
                    ) : (
                      <div className={styles.playlistThumbPlaceholder} />
                    )}
                    <span className={styles.playlistPlayBadge} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className={styles.playlistMeta}>
                    <span className={styles.playlistItemTitle}>{v.title}</span>
                    {v.description && <span className={styles.playlistItemDescription}>{v.description}</span>}
                    {v.category && <span className={styles.playlistItemCategory}>{v.category}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
