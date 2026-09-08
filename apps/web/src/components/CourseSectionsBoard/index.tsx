'use client';

import { useMemo, useState } from 'react';
import CourseScroller from '@/components/CourseScroller';
import type { CourseWithAccess } from '@/data/courses';
import { NEW_COURSE_SLUGS, NEW_COURSE_SLUG_SET } from '@/lib/newCourses';
import styles from './styles.module.css';

const ALL_TAB = '__all__';
const UNCATEGORIZED_KEY = '__uncategorized__';

// Known categories in display order; any other value the free-form DB
// column holds is appended alphabetically, with "no category" last.
const CATEGORY_ORDER = ['tech', 'life-skills', 'Presentation'];
const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  'life-skills': 'Life Skills',
  Presentation: 'Presentation Skills',
};

function titleCase(raw: string): string {
  return raw.replace(/(^|[\s\-_/])([a-z])/g, (_, sep: string, ch: string) => `${sep === '_' || sep === '-' ? ' ' : sep}${ch.toUpperCase()}`);
}

function categoryKey(course: CourseWithAccess): string {
  return course.category && course.category.trim() ? course.category.trim() : UNCATEGORIZED_KEY;
}

function categoryLabel(key: string): string {
  if (key === ALL_TAB) return 'All';
  if (key === UNCATEGORIZED_KEY) return 'Other';
  return CATEGORY_LABELS[key] ?? titleCase(key);
}

function isInProgress(c: CourseWithAccess): boolean {
  return c.hasFullAccess && c.totalModules > 0 && c.completedModules > 0 && c.completedModules < c.totalModules;
}

function isCompleted(c: CourseWithAccess): boolean {
  return c.hasFullAccess && c.totalModules > 0 && c.completedModules >= c.totalModules;
}

function splitCsv(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const MIGHT_LIKE_CAP = 12;

type Variant = 'my-courses' | 'browse';

/**
 * Shared body for the two catalog pages — a category tab bar (All + one
 * tab per category present) over horizontally-scrolling course strips.
 *
 * `my-courses` (/learn): tabs from the courses the user can fully take;
 * strips are Continue where you left off → Courses you might like (capped
 * at 12) → Completed.
 *
 * `browse` (/browse-courses): tabs from the whole published catalog. Every
 * tab shows the FULL catalog for its scope, grouped into one section per
 * category (Continue where you left off still sits on top). The "All" tab
 * lists every category section in tab order; a category tab shows just that
 * one. No curation, no cap, and no Completed strip.
 *
 * "Courses you might like" is, in priority order: courses named in the
 * relatedCourses of what you're taking/finished, then full-access courses
 * you haven't started, then courses you don't have access to (their card
 * shows a Preview badge). It is de-duped against the other strips.
 *
 * `courses` is the whole published catalog with per-user access + progress
 * (GET /courses/sidebar-list); this component does all the slicing.
 */
export default function CourseSectionsBoard({
  courses,
  bookmarkedIds,
  variant = 'my-courses',
}: {
  courses: CourseWithAccess[];
  bookmarkedIds: string[];
  variant?: Variant;
}): React.JSX.Element {
  const showCompleted = variant === 'my-courses';

  // Which courses seed the tab bar: everything on Browse, only the
  // user's own on My Courses.
  const tabSource = useMemo(
    () => (variant === 'browse' ? courses : courses.filter((c) => c.hasFullAccess)),
    [courses, variant],
  );

  const tabs = useMemo(() => {
    const present = new Set(tabSource.map(categoryKey));
    const canonical = CATEGORY_ORDER.filter((k) => present.has(k));
    const extras = [...present]
      .filter((k) => k !== UNCATEGORIZED_KEY && !CATEGORY_ORDER.includes(k))
      .sort((a, b) => a.localeCompare(b));
    const ordered = [...canonical, ...extras, ...(present.has(UNCATEGORIZED_KEY) ? [UNCATEGORIZED_KEY] : [])];
    return [ALL_TAB, ...ordered];
  }, [tabSource]);

  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const currentTab = tabs.includes(activeTab) ? activeTab : ALL_TAB;
  const showNewCourses = variant === 'browse' && currentTab === ALL_TAB;

  const { continueList, mightLike, completedList } = useMemo(() => {
    const inScope = (c: CourseWithAccess): boolean => currentTab === ALL_TAB || categoryKey(c) === currentTab;
    const scoped = courses.filter(inScope);

    const continueList = scoped
      .filter(isInProgress)
      .sort((a, b) => b.completedModules / b.totalModules - a.completedModules / a.totalModules || a.name.localeCompare(b.name));

    const completedInScope = scoped.filter(isCompleted);
    const completedList = showCompleted ? [...completedInScope].sort((a, b) => a.name.localeCompare(b.name)) : [];

    // Never surface a course that's already in another strip. On Browse,
    // completed courses are excluded outright (no Completed strip, and the
    // user asked not to show them there).
    const placed = new Set([...continueList, ...completedInScope].map((c) => c.id));

    const relatedSlugs = new Set([...continueList, ...completedInScope].flatMap((c) => splitCsv(c.relatedCourses)));
    const related = scoped.filter((c) => relatedSlugs.has(c.slug) && !placed.has(c.id));
    related.forEach((c) => placed.add(c.id));

    const notStarted = scoped.filter((c) => c.hasFullAccess && !c.started && c.completedModules === 0 && !placed.has(c.id));
    notStarted.forEach((c) => placed.add(c.id));

    const noAccess = scoped.filter((c) => !c.hasFullAccess && !placed.has(c.id));

    const blended = [...related, ...notStarted, ...noAccess];
    const mightLike = variant === 'browse' ? blended : blended.slice(0, MIGHT_LIKE_CAP);

    return { continueList, mightLike, completedList };
  }, [courses, currentTab, showCompleted, variant]);

  const newCourses = useMemo(() => {
    if (!showNewCourses) return [];
    const alreadyShown = new Set(continueList.map((course) => course.id));
    const rank = new Map<string, number>(NEW_COURSE_SLUGS.map((slug, index) => [slug, index]));
    return courses
      .filter((course) => NEW_COURSE_SLUG_SET.has(course.slug) && !alreadyShown.has(course.id))
      .sort((a, b) => (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER));
  }, [continueList, courses, showNewCourses]);

  // Browse variant: the current tab's whole scope, split into one section
  // per category (tab order). "All" → every category; a category tab → just
  // that one. This is the full catalog, uncurated and uncapped — but a
  // course already shown in "Continue where you left off" is not repeated
  // in its category section (no card appears twice within a tab).
  const categoryGroups = useMemo(() => {
    if (variant !== 'browse') return [] as { key: string; label: string; courses: CourseWithAccess[] }[];
    const inScope = (c: CourseWithAccess): boolean => currentTab === ALL_TAB || categoryKey(c) === currentTab;
    const alreadyShown = new Set([...continueList, ...newCourses].map((c) => c.id));
    const byCat = new Map<string, CourseWithAccess[]>();
    for (const c of courses.filter(inScope)) {
      if (alreadyShown.has(c.id)) continue;
      const k = categoryKey(c);
      const bucket = byCat.get(k);
      if (bucket) bucket.push(c);
      else byCat.set(k, [c]);
    }
    return tabs
      .filter((t) => t !== ALL_TAB && byCat.has(t))
      .map((k) => ({
        key: k,
        label: categoryLabel(k),
        courses: [...(byCat.get(k) ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [variant, courses, currentTab, tabs, continueList, newCourses]);

  const noCourses = tabSource.length === 0;
  const nothingInTab =
    variant === 'browse'
      ? continueList.length === 0 && newCourses.length === 0 && categoryGroups.length === 0
      : continueList.length === 0 && mightLike.length === 0 && completedList.length === 0;

  return (
    <>
      {noCourses ? (
        <p className={styles.emptyText}>No courses available yet.</p>
      ) : (
        <>
          {tabs.length > 1 && (
            <div className={styles.tabs} role="tablist" aria-label="Course categories">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={tab === currentTab}
                  className={`${styles.tab} ${tab === currentTab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {categoryLabel(tab)}
                </button>
              ))}
            </div>
          )}

          {nothingInTab ? (
            <p className={styles.emptyText}>Nothing in this category yet.</p>
          ) : variant === 'browse' ? (
            <>
              <CourseScroller
                title="Continue where you left off"
                courses={continueList}
                bookmarkedIds={bookmarkedIds}
                showNewBadges
              />
              <CourseScroller title="New Courses" courses={newCourses} bookmarkedIds={bookmarkedIds} showNewBadges />
              {categoryGroups.map((group) => (
                <CourseScroller
                  key={group.key}
                  title={group.label}
                  courses={group.courses}
                  bookmarkedIds={bookmarkedIds}
                  showNewBadges
                />
              ))}
            </>
          ) : (
            <>
              <CourseScroller title="Continue where you left off" courses={continueList} bookmarkedIds={bookmarkedIds} />
              <CourseScroller title="Courses you might like" courses={mightLike} bookmarkedIds={bookmarkedIds} />
              {showCompleted && <CourseScroller title="Completed" courses={completedList} bookmarkedIds={bookmarkedIds} />}
            </>
          )}
        </>
      )}
    </>
  );
}
