'use client';

import { useMemo, useState } from 'react';
import CodingProblemCard from '@/components/CodingProblemCard';
import type { CodingProblemSummary } from '@/data/codingProblems';
import { compareCategoryLabels, packPillsByRow } from '@/lib/codingCategoryOrder';
import EmptyState from '@/components/EmptyState';
import styles from './styles.module.css';

const ALL_CATEGORY = '__all__';
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

function difficultyLabel(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

// Tag-cloud font-size steps, keyed by how a category's problem count ranks
// against the others (0 = most-populated category) — biggest category gets
// the biggest pill, same idea as a classic word cloud.
const CLOUD_SIZE_STEPS = [styles.cloudSize0, styles.cloudSize1, styles.cloudSize2, styles.cloudSize3];
// The same steps as font sizes in px (.cloudSize0-3 in styles.module.css: 0.98,
// 0.9, 0.82, 0.75rem) -- used to estimate pill widths for row packing. Keep in
// step with the CSS.
const CLOUD_FONT_PX = [0.98, 0.9, 0.82, 0.75].map((rem) => rem * 16);
// "All" always uses the third step, as before.
const ALL_STEP = 2;

/**
 * Two-column layout for the Practice Coding catalog: the numbered problem
 * list on the left, and filters on the right as a tag cloud — category
 * pills sized by how many problems they hold, plus Easy/Medium/Hard pills.
 * No tabs — category is single-select, difficulty is multi-select, both
 * combine and update the same list in place.
 */
export default function CodingProblemsBoard({
  problems,
}: {
  problems: CodingProblemSummary[];
}): React.JSX.Element {
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of problems) if (!seen.has(p.category)) seen.set(p.category, p.categoryLabel);
    return [...seen.entries()].sort((a, b) => compareCategoryLabels(a[1], b[1]));
  }, [problems]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of problems) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return counts;
  }, [problems]);

  // Rank categories by count (descending) to pick each pill's cloud size —
  // independent of the display order above (canonical DSA-pattern order),
  // which stays fixed regardless of count.
  const cloudStepByCategory = useMemo(() => {
    const ranked = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const stepByCount = new Map<number, number>();
    let step = 0;
    for (const [, count] of ranked) {
      if (!stepByCount.has(count)) {
        stepByCount.set(count, Math.min(step, CLOUD_SIZE_STEPS.length - 1));
        step++;
      }
    }
    const byCategory = new Map<string, number>();
    for (const [key, count] of categoryCounts) byCategory.set(key, stepByCount.get(count) ?? CLOUD_SIZE_STEPS.length - 1);
    return byCategory;
  }, [categoryCounts]);

  // Pills in display order: "All" first, then the categories in canonical order
  // -- except that when the next one wouldn't fit in the current row, a later,
  // narrower one is pulled forward to fill the gap (see packPillsByRow).
  const orderedPills = useMemo(() => {
    const step = (key: string): number => cloudStepByCategory.get(key) ?? CLOUD_SIZE_STEPS.length - 1;
    return packPillsByRow([
      { key: ALL_CATEGORY, label: 'All', count: problems.length, step: ALL_STEP, fontPx: CLOUD_FONT_PX[ALL_STEP] },
      ...categories.map(([key, label]) => ({
        key,
        label,
        count: categoryCounts.get(key) ?? 0,
        step: step(key),
        fontPx: CLOUD_FONT_PX[step(key)],
      })),
    ]);
  }, [categories, categoryCounts, cloudStepByCategory, problems.length]);

  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const currentCategory = activeCategory === ALL_CATEGORY || categories.some(([key]) => key === activeCategory) ? activeCategory : ALL_CATEGORY;

  const [activeDifficulties, setActiveDifficulties] = useState<Set<Difficulty>>(new Set());

  function toggleDifficulty(d: Difficulty): void {
    setActiveDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  const inCategory = useMemo(
    () => (currentCategory === ALL_CATEGORY ? problems : problems.filter((p) => p.category === currentCategory)),
    [problems, currentCategory],
  );

  const difficultyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of inCategory) counts.set(p.difficulty, (counts.get(p.difficulty) ?? 0) + 1);
    return counts;
  }, [inCategory]);

  const visible = useMemo(() => {
    const filtered = activeDifficulties.size === 0 ? inCategory : inCategory.filter((p) => activeDifficulties.has(p.difficulty as Difficulty));
    return [...filtered].sort(
      (a, b) => compareCategoryLabels(a.categoryLabel, b.categoryLabel) || a.orderIndex - b.orderIndex || a.title.localeCompare(b.title),
    );
  }, [inCategory, activeDifficulties]);

  // In the "All" view, group by category so each pattern gets its own
  // heading and its own 1-based numbering, instead of one flat list mixing
  // categories together.
  const visibleByCategory = useMemo(() => {
    const groups = new Map<string, { label: string; items: CodingProblemSummary[] }>();
    for (const p of visible) {
      const group = groups.get(p.category);
      if (group) group.items.push(p);
      else groups.set(p.category, { label: p.categoryLabel, items: [p] });
    }
    return [...groups.entries()].sort((a, b) => compareCategoryLabels(a[1].label, b[1].label));
  }, [visible]);

  // With a single category selected, group by difficulty instead (Easy,
  // then Medium, then Hard) — same "section heading + its own numbering"
  // treatment as Browse Courses uses for its category groupings.
  const visibleByDifficulty = useMemo(() => {
    const groups = new Map<Difficulty, CodingProblemSummary[]>();
    for (const p of visible) {
      const d = p.difficulty as Difficulty;
      const items = groups.get(d);
      if (items) items.push(p);
      else groups.set(d, [p]);
    }
    return DIFFICULTIES.filter((d) => groups.has(d)).map((d) => [d, groups.get(d)!] as const);
  }, [visible]);

  if (problems.length === 0) {
    return <EmptyState illustration="code" title="No coding problems published yet." description="Practice problems will appear here as soon as they're published." />;
  }

  const activeCategoryLabel = currentCategory === ALL_CATEGORY ? null : categories.find(([key]) => key === currentCategory)?.[1] ?? null;

  return (
    <div className={styles.layout}>
      <div className={styles.results}>
        <div className={styles.resultsHeader}>
          {activeCategoryLabel ? (
            <button type="button" className={styles.categoryChip} onClick={() => setActiveCategory(ALL_CATEGORY)}>
              <span className={`${styles.categoryDot} ${styles.categoryDotOn}`} aria-hidden="true" />
              {activeCategoryLabel}
              <span className={styles.categoryChipClose} aria-hidden="true">×</span>
              <span className={styles.srOnly}>Clear category filter</span>
            </button>
          ) : (
            <span />
          )}
          <div className={styles.difficultyFilters}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.pill} ${styles.difficultyPill} ${styles[`difficultyPill${difficultyLabel(d)}`]} ${activeDifficulties.has(d) ? styles.pillActive : ''}`}
                aria-pressed={activeDifficulties.has(d)}
                onClick={() => toggleDifficulty(d)}
              >
                <span className={styles.difficultyDot} aria-hidden="true" />
                {difficultyLabel(d)}
                <span className={styles.pillCount}>{difficultyCounts.get(d) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState illustration="search" compact title="No problems match these filters." description="Try a different category or difficulty." />
        ) : activeCategoryLabel ? (
          visibleByDifficulty.map(([difficulty, items]) => (
            <div key={difficulty} className={styles.categorySection}>
              <h2 className={`${styles.categorySectionHeading} ${styles[`difficultyHeading${difficultyLabel(difficulty)}`]}`}>
                {difficultyLabel(difficulty)}
              </h2>
              <ul className={styles.list}>
                {items.map((problem, i) => (
                  <li key={problem.id} className={styles.item}>
                    <CodingProblemCard problem={problem} index={i + 1} showBookmark={false} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          visibleByCategory.map(([key, group]) => (
            <div key={key} className={styles.categorySection}>
              <h2 className={styles.categorySectionHeading}>{group.label}</h2>
              <ul className={styles.list}>
                {group.items.map((problem, i) => (
                  <li key={problem.id} className={styles.item}>
                    <CodingProblemCard problem={problem} index={i + 1} showBookmark={false} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <aside className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Category</span>
          <div className={styles.pillCloud}>
            {orderedPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                className={`${styles.pill} ${styles.categoryPill} ${CLOUD_SIZE_STEPS[pill.step]} ${currentCategory === pill.key ? styles.pillActive : ''}`}
                aria-pressed={currentCategory === pill.key}
                onClick={() => setActiveCategory(pill.key)}
              >
                <span className={styles.categoryDot} aria-hidden="true" />
                {pill.label}
                <span className={styles.pillCount}>{pill.count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
