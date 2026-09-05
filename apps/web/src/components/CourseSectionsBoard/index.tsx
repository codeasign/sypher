'use client';

import { useMemo, useState } from 'react';
import CourseScroller from '@/components/CourseScroller';
import { AUDIENCE_ROLES, type CourseWithAccess } from '@/data/courses';
import styles from './styles.module.css';

const ALL_TAB = '__all__';
const ALL_ROLES = '__all_roles__';
const UNCATEGORIZED_KEY = '__uncategorized__';

// Known categories in display order; any other value the free-form DB
// column holds is appended alphabetically, with "no category" last.
const CATEGORY_ORDER = ['tech', 'life-skills', 'Presentation'];
const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  'life-skills': 'Life Skills',
  Presentation: 'Presentation',
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

function roleLabel(value: string): string {
  return AUDIENCE_ROLES.find((r) => r.value === value)?.label ?? titleCase(value.replace(/-/g, ' '));
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
 * one. No curation, no cap, no Completed strip. `showRoleFilter` adds an
 * audience-role dropdown above the tabs (default None = no filter).
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
  showRoleFilter = false,
}: {
  courses: CourseWithAccess[];
  bookmarkedIds: string[];
  variant?: Variant;
  /** Show the audience-role dropdown (Browse Courses). Default None = no filter. */
  showRoleFilter?: boolean;
}): React.JSX.Element {
  const showCompleted = variant === 'my-courses';

  // Audience-role options: every audienceRole present in the catalog,
  // canonical order (AUDIENCE_ROLES) first, then any extras alphabetically.
  const roleOptions = useMemo(() => {
    if (!showRoleFilter) return [];
    const present = new Set(courses.map((c) => c.audienceRole).filter((r): r is string => Boolean(r && r.trim())));
    const canonical = AUDIENCE_ROLES.map((r) => r.value).filter((v) => present.has(v));
    const extras = [...present].filter((r) => !canonical.includes(r)).sort((a, b) => a.localeCompare(b));
    return [...canonical, ...extras];
  }, [courses, showRoleFilter]);

  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const activeRole = roleOptions.includes(roleFilter) ? roleFilter : ALL_ROLES;

  // Everything downstream (tabs + strips) works off the role-filtered set.
  const scopedByRole = useMemo(
    () => (activeRole === ALL_ROLES ? courses : courses.filter((c) => c.audienceRole === activeRole)),
    [courses, activeRole],
  );

  // Which courses seed the tab bar: everything on Browse, only the
  // user's own on My Courses.
  const tabSource = useMemo(
    () => (variant === 'browse' ? scopedByRole : scopedByRole.filter((c) => c.hasFullAccess)),
    [scopedByRole, variant],
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

  const { continueList, mightLike, completedList } = useMemo(() => {
    const inScope = (c: CourseWithAccess): boolean => currentTab === ALL_TAB || categoryKey(c) === currentTab;
    const scoped = scopedByRole.filter(inScope);

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
  }, [scopedByRole, currentTab, showCompleted, variant]);

  // Browse variant: the current tab's whole scope, split into one section
  // per category (tab order). "All" → every category; a category tab → just
  // that one. This is the full catalog, uncurated and uncapped — but a
  // course already shown in "Continue where you left off" is not repeated
  // in its category section (no card appears twice within a tab).
  const categoryGroups = useMemo(() => {
    if (variant !== 'browse') return [] as { key: string; label: string; courses: CourseWithAccess[] }[];
    const inScope = (c: CourseWithAccess): boolean => currentTab === ALL_TAB || categoryKey(c) === currentTab;
    const alreadyShown = new Set(continueList.map((c) => c.id));
    const byCat = new Map<string, CourseWithAccess[]>();
    for (const c of scopedByRole.filter(inScope)) {
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
  }, [variant, scopedByRole, currentTab, tabs, continueList]);

  const noCourses = tabSource.length === 0;
  const nothingInTab =
    variant === 'browse'
      ? continueList.length === 0 && categoryGroups.length === 0
      : continueList.length === 0 && mightLike.length === 0 && completedList.length === 0;

  return (
    <>
      {showRoleFilter && roleOptions.length > 0 && (
        <div className={styles.filterBar}>
          <label className={styles.filterLabel} htmlFor="role-filter">
            Role
          </label>
          <select
            id="role-filter"
            className={styles.roleSelect}
            value={activeRole}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value={ALL_ROLES}>None</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
      )}

      {noCourses ? (
        <p className={styles.emptyText}>
          {activeRole === ALL_ROLES ? 'No courses available yet.' : `No ${roleLabel(activeRole)} courses.`}
        </p>
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
              <CourseScroller title="Continue where you left off" courses={continueList} bookmarkedIds={bookmarkedIds} />
              {categoryGroups.map((group) => (
                <CourseScroller key={group.key} title={group.label} courses={group.courses} bookmarkedIds={bookmarkedIds} />
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
