import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseModule, CourseModuleSummary } from '@/data/courses';
import type { AuthoredModuleBookmarkEntry } from '@/data/bookmarks';
import CourseModuleArticle from '@/components/CourseModulePage/CourseModuleArticle';
import ModuleCompletionTracker from '@/components/CourseModulePage/ModuleCompletionTracker';
import LockedModuleNotice from '@/components/CourseModulePage/LockedModuleNotice';
import { ModuleBookmarkButton } from '@/components/AuthoredBookmarkButton';
import Tooltip from '@/components/Tooltip';
import styles from '@/components/CourseModulePage/styles.module.css';

interface AuthUser {
  email: string;
}

async function fetchModule(slug: string, moduleSlug: string): Promise<{ module: CourseModule | null; unauthenticated: boolean }> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules/${encodeURIComponent(moduleSlug)}`);
  if (res.status === 401) return { module: null, unauthenticated: true };
  if (res.status === 404) return { module: null, unauthenticated: false };
  if (!res.ok) throw new Error(`Could not load lesson (${res.status})`);
  return { module: await res.json(), unauthenticated: false };
}

// Metadata-only, ordered by orderIndex, with per-user access/progress flags.
// Reused for the position counter and previous/next navigation without
// downloading every lesson body.
async function fetchCourseModules(slug: string): Promise<CourseModuleSummary[]> {
  const res = await serverApiFetch(`/courses/${encodeURIComponent(slug)}/modules`);
  if (!res.ok) throw new Error(`Could not load course topics (${res.status})`);
  return res.json();
}

async function fetchModuleBookmarks(): Promise<AuthoredModuleBookmarkEntry[]> {
  const res = await serverApiFetch('/bookmarks/authored-modules');
  if (!res.ok) throw new Error(`Could not load lesson bookmarks (${res.status})`);
  return res.json();
}

async function fetchAuthUser(): Promise<AuthUser> {
  const res = await serverApiFetch('/auth/me');
  if (!res.ok) throw new Error(`Could not load account details (${res.status})`);
  return res.json();
}

// Big edge-pager chevrons — simple stroked geometry drawn locally (same
// inline-stroke convention as BlogPostPage/CodeBlock's copy icons). Not
// added to ActionIcons because those use filled Material Symbols path
// data, and guessing that path data from memory is banned.
function ChevronLeftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
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

  const [bookmarks, allModules, me] = await Promise.all([
    fetchModuleBookmarks(),
    fetchCourseModules(slug),
    mod.locked ? fetchAuthUser() : Promise.resolve(null),
  ]);
  const isBookmarked = bookmarks.some((b) => b.moduleId === mod.id);

  const currentIndex = allModules.findIndex((m) => m.id === mod.id);
  const previous = currentIndex > 0 ? allModules[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  // Only fetched when actually needed — the locked-notice CTA is the only
  // consumer, and it's the uncommon path (most module views are
  // unlocked).
  const userEmail = me?.email ?? '';

  return (
    <div className={styles.page}>
      {/* Outside the paper sheet, pinned under the navbar — Back to Course
          on the left, Bookmark on the right, visible for the entire scroll
          (user request 2026-08-23). The x/N counter between them shows the
          current topic's position in the course. */}
      <div className={styles.moduleTopRow}>
        <Link href={`/learn/${slug}`} className={styles.backLink}>
          ← Back to course
        </Link>
        {currentIndex >= 0 && (
          <span
            className={styles.modulePosition}
            aria-label={`Topic ${currentIndex + 1} of ${allModules.length}`}
          >
            {currentIndex + 1} / {allModules.length}
          </span>
        )}
        <ModuleBookmarkButton moduleId={mod.id} courseId={mod.courseId} initialBookmarked={isBookmarked} />
      </div>
      <div className={styles.container}>
        {!mod.locked && <ModuleCompletionTracker courseSlug={slug} moduleSlug={moduleSlug} alreadyComplete={mod.completed ?? false} />}
        {mod.locked ? (
          <>
            <h1 className={styles.title}>{mod.title}</h1>
            <LockedModuleNotice userEmail={userEmail} />
          </>
        ) : (
          <CourseModuleArticle title={mod.title} content={mod.bodyMdx} />
        )}
      </div>

      {/* Edge pager OUTSIDE the paper sheet — big chevrons on the left and
          right screen edges, vertically centered, always visible while
          reading (user refinement 2026-08-23). Destination titles live in
          the shared Tooltip; aria-labels carry them for screen readers. */}
      {!mod.locked && (previous || next) && (
        <nav className={styles.pagination} aria-label="Module pages">
          {previous ? (
            <Tooltip label={`Previous: ${previous.title}`}>
              <Link href={`/learn/${slug}/${previous.slug}`} className={styles.paginationLink} aria-label={`Previous topic: ${previous.title}`}>
                <ChevronLeftIcon className={styles.pagerIcon} />
              </Link>
            </Tooltip>
          ) : (
            <span />
          )}
          {next ? (
            <Tooltip label={`Next: ${next.title}`}>
              <Link href={`/learn/${slug}/${next.slug}`} className={styles.paginationLink} aria-label={`Next topic: ${next.title}`}>
                <ChevronRightIcon className={styles.pagerIcon} />
              </Link>
            </Tooltip>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
