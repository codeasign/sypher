import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseModule } from '@/data/courses';
import type { AuthoredModuleBookmarkEntry } from '@/data/bookmarks';
import CourseModuleArticle from '@/components/CourseModulePage/CourseModuleArticle';
import ModuleCompletionTracker from '@/components/CourseModulePage/ModuleCompletionTracker';
import LockedModuleNotice from '@/components/CourseModulePage/LockedModuleNotice';
import { ModuleBookmarkButton } from '@/components/AuthoredBookmarkButton';
import styles from '@/components/CourseModulePage/styles.module.css';

interface AuthUser {
  email: string;
}

async function fetchModule(slug: string, moduleSlug: string): Promise<{ module: CourseModule | null; unauthenticated: boolean }> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules/${encodeURIComponent(moduleSlug)}`);
  if (res.status === 401) return { module: null, unauthenticated: true };
  if (!res.ok) return { module: null, unauthenticated: false };
  return { module: await res.json(), unauthenticated: false };
}

// Already ordered by orderIndex and access-filtered server-side (full list
// for hasFullAccess, getting-started-only otherwise), and now also carries
// each module's per-user completed flag — reused for both the top-of-page
// index and previous/next, so a module this user isn't allowed to open can
// never appear in either.
async function fetchCourseModules(slug: string): Promise<CourseModule[]> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules`);
  return res.ok ? res.json() : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; moduleSlug: string }>;
}): Promise<Metadata> {
  const { slug, moduleSlug } = await params;
  const { module: mod } = await fetchModule(slug, moduleSlug);
  if (!mod) return {};
  return { title: mod.title };
}

export default async function CourseModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleSlug: string }>;
}): Promise<React.JSX.Element> {
  const { slug, moduleSlug } = await params;
  const { module: mod, unauthenticated } = await fetchModule(slug, moduleSlug);
  if (unauthenticated) redirect('/login');
  if (!mod) notFound();

  const bookmarksRes = await serverApiFetch('/bookmarks/authored-modules');
  const bookmarks: AuthoredModuleBookmarkEntry[] = bookmarksRes.ok ? await bookmarksRes.json() : [];
  const isBookmarked = bookmarks.some((b) => b.moduleId === mod.id);

  const allModules = await fetchCourseModules(slug);
  const currentIndex = allModules.findIndex((m) => m.id === mod.id);
  const previous = currentIndex > 0 ? allModules[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  // Only fetched when actually needed — the locked-notice CTA is the only
  // consumer, and it's the uncommon path (most module views are
  // unlocked).
  let userEmail = '';
  if (mod.locked) {
    const meRes = await serverApiFetch('/auth/me');
    const me: AuthUser | null = meRes.ok ? await meRes.json() : null;
    userEmail = me?.email ?? '';
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {!mod.locked && <ModuleCompletionTracker courseSlug={slug} moduleSlug={moduleSlug} />}
        <div className={styles.moduleTopRow}>
          <Link href={`/learn/${slug}`} className={styles.backLink}>
            ← Back to course
          </Link>
          <ModuleBookmarkButton moduleId={mod.id} courseId={mod.courseId} initialBookmarked={isBookmarked} />
        </div>
        {mod.locked ? (
          <>
            <h1 className={styles.title}>{mod.title}</h1>
            <LockedModuleNotice userEmail={userEmail} />
          </>
        ) : (
          <CourseModuleArticle title={mod.title} content={mod.bodyMdx} />
        )}

        {!mod.locked && (previous || next) && (
          <nav className={styles.pagination} aria-label="Module pages">
            {previous ? (
              <Link href={`/learn/${slug}/${previous.slug}`} className={`${styles.paginationLink} ${styles.paginationPrev}`}>
                <span className={styles.paginationSubLabel}>← Previous</span>
                <span className={styles.paginationTitle}>{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/learn/${slug}/${next.slug}`} className={`${styles.paginationLink} ${styles.paginationNext}`}>
                <span className={styles.paginationSubLabel}>Next →</span>
                <span className={styles.paginationTitle}>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
