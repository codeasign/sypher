'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import type { CourseWithAccess } from '@/data/courses';
import CourseScroller from '@/components/CourseScroller';
import { MenuBookIcon } from '@/components/icons/ActionIcons';
import { ModuleBookmarkButton } from '@/components/AuthoredBookmarkButton';
import styles from './styles.module.css';

// The lesson renderer pulls in react-markdown + plugins + the code-block
// component. Load that chunk only when a lesson is actually opened so the
// Bookmarks route stays light on first paint.
const CourseModuleArticle = dynamic(() => import('@/components/CourseModulePage/CourseModuleArticle'), {
  ssr: false,
  loading: () => <p className={styles.emptyText}>Loading lesson…</p>,
});

export interface BookmarkedModule {
  id: string;
  slug: string;
  title: string;
  courseId: string;
  course: { slug: string; name: string };
}

interface BookmarksContentProps {
  initialCourses: CourseWithAccess[];
  initialModules: BookmarkedModule[];
}

type Tab = 'courses' | 'modules';

interface ModuleDetail {
  title: string;
  bodyMdx: string;
  locked: boolean;
  sectionLabel: string | null;
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  modules: BookmarkedModule[];
}

/** Bucket bookmarked modules under their course, courses A–Z, modules in bookmark order. */
function groupByCourse(modules: BookmarkedModule[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();
  for (const mod of modules) {
    let group = map.get(mod.courseId);
    if (!group) {
      group = { courseId: mod.courseId, courseName: mod.course.name, modules: [] };
      map.set(mod.courseId, group);
    }
    group.modules.push(mod);
  }
  return [...map.values()].sort((a, b) => a.courseName.localeCompare(b.courseName));
}

/**
 * Modules tab: a two-pane master/detail. Left is a course-grouped menu of
 * bookmarked lessons; selecting one loads its full lesson body on the right
 * (same renderer as the course reader).
 *
 * Loading is lazy: nothing is fetched until a lesson is picked. Hovering or
 * tab-focusing a menu row prefetches that lesson's body into an in-memory
 * cache, so the click that follows renders instantly. In-flight requests are
 * de-duped so a prefetch and a click never fire twice.
 */
function ModulesPane({
  modules,
  onModuleChange,
}: {
  modules: BookmarkedModule[];
  onModuleChange: (moduleId: string, bookmarked: boolean) => void;
}): React.JSX.Element {
  const groups = useMemo(() => groupByCourse(modules), [modules]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, ModuleDetail>());
  const inflight = useRef(new Map<string, Promise<ModuleDetail>>());

  const loadDetail = useCallback((mod: BookmarkedModule): Promise<ModuleDetail> => {
    const cached = cache.current.get(mod.id);
    if (cached) return Promise.resolve(cached);
    const pending = inflight.current.get(mod.id);
    if (pending) return pending;
    const request = apiFetch(
      `/courses/${encodeURIComponent(mod.course.slug)}/modules/${encodeURIComponent(mod.slug)}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`Could not load lesson (${res.status})`);
        const data = (await res.json()) as { title: string; bodyMdx: string; locked?: boolean; sectionLabel?: string | null };
        const next: ModuleDetail = {
          title: data.title,
          bodyMdx: data.bodyMdx,
          locked: data.locked ?? false,
          sectionLabel: data.sectionLabel ?? null,
        };
        cache.current.set(mod.id, next);
        return next;
      })
      .finally(() => {
        inflight.current.delete(mod.id);
      });
    inflight.current.set(mod.id, request);
    return request;
  }, []);

  const prefetch = useCallback(
    (mod: BookmarkedModule): void => {
      void loadDetail(mod).catch(() => {});
    },
    [loadDetail],
  );

  // Drop the selection back to the placeholder if the chosen lesson is
  // un-bookmarked from the detail header.
  useEffect(() => {
    if (selectedId && !modules.some((m) => m.id === selectedId)) {
      setSelectedId(null);
    }
  }, [modules, selectedId]);

  const selected = modules.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }
    const cached = cache.current.get(selected.id);
    if (cached) {
      setDetail(cached);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    loadDetail(selected)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load lesson');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, loadDetail]);

  if (modules.length === 0) {
    return <p className={styles.emptyText}>No bookmarked modules yet.</p>;
  }

  return (
    <div className={styles.modulesPane}>
      <nav className={styles.moduleMenu} aria-label="Bookmarked lessons">
        {groups.map((group) => (
          <div key={group.courseId} className={styles.menuGroup}>
            <p className={styles.menuGroupTitle}>
              <MenuBookIcon className={styles.menuGroupIcon} />
              <span className={styles.menuGroupName}>{group.courseName}</span>
            </p>
            <ul className={styles.menuList}>
              {group.modules.map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${mod.id === selectedId ? styles.menuItemActive : ''}`}
                    aria-current={mod.id === selectedId}
                    onClick={() => setSelectedId(mod.id)}
                    onMouseEnter={() => prefetch(mod)}
                    onFocus={() => prefetch(mod)}
                  >
                    {mod.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.moduleDetail}>
        {!selected ? (
          <div className={styles.detailEmpty}>
            <svg
              className={styles.detailEmptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p className={styles.detailEmptyTitle}>Select a bookmarked lesson</p>
            <p className={styles.detailEmptyText}>Pick one from the list to read it here.</p>
          </div>
        ) : (
          <>
            <div className={styles.detailHeader}>
              <Link
                href={`/learn/${selected.course.slug}/${selected.slug}`}
                className={styles.openLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in course ↗
              </Link>
              <ModuleBookmarkButton
                key={selected.id}
                moduleId={selected.id}
                courseId={selected.courseId}
                initialBookmarked
                onChange={(b) => onModuleChange(selected.id, b)}
              />
            </div>

            <nav className={styles.crumbs} aria-label="Lesson location">
              <Link
                href={`/learn/${selected.course.slug}`}
                className={styles.crumbLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selected.course.name}
              </Link>
              {detail?.sectionLabel && (
                <>
                  <span className={styles.crumbSep} aria-hidden>
                    ›
                  </span>
                  <span className={styles.crumb}>{detail.sectionLabel}</span>
                </>
              )}
              <span className={styles.crumbSep} aria-hidden>
                ›
              </span>
              <Link
                href={`/learn/${selected.course.slug}/${selected.slug}`}
                className={styles.crumbLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selected.title}
              </Link>
              <span className={styles.crumbSep} aria-hidden>
                ›
              </span>
              <span className={styles.crumbSlug}>{selected.slug}</span>
            </nav>

            {loading && <p className={styles.emptyText}>Loading lesson…</p>}
            {error && <p className={styles.errorText}>{error}</p>}
            {!loading && !error && detail && (
              detail.locked ? (
                <p className={styles.emptyText}>
                  This lesson is locked.{' '}
                  <Link href={`/learn/${selected.course.slug}/${selected.slug}`} target="_blank" rel="noopener noreferrer">
                    Open it in the course
                  </Link>{' '}
                  to unlock full access.
                </p>
              ) : (
                <CourseModuleArticle title={detail.title} content={detail.bodyMdx} />
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BookmarksContent({ initialCourses, initialModules }: BookmarksContentProps): React.JSX.Element {
  // Courses come straight from the server component so an un-bookmark on a
  // card (which triggers router.refresh()) drops the card on the refetch.
  const courses = initialCourses;
  // Modules keep local state for instant removal — the two-pane selection
  // needs to move off a just-removed lesson without waiting on the refetch.
  const [modules, setModules] = useState(initialModules);
  const [tab, setTab] = useState<Tab>('courses');

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  function handleModuleChange(moduleId: string, bookmarked: boolean): void {
    if (!bookmarked) setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Bookmark type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'courses'}
          className={`${styles.tab} ${tab === 'courses' ? styles.tabActive : ''}`}
          onClick={() => setTab('courses')}
        >
          Courses ({courses.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'modules'}
          className={`${styles.tab} ${tab === 'modules' ? styles.tabActive : ''}`}
          onClick={() => setTab('modules')}
        >
          Modules ({modules.length})
        </button>
      </div>

      <div className={styles.tabPanel}>
        {tab === 'courses' ? (
          courses.length === 0 ? (
            <p className={styles.emptyText}>No bookmarked courses yet.</p>
          ) : (
            // Same card view as Browse Courses / My Courses.
            <CourseScroller courses={courses} bookmarkedIds={courses.map((c) => c.id)} />
          )
        ) : (
          <ModulesPane modules={modules} onModuleChange={handleModuleChange} />
        )}
      </div>
    </>
  );
}
