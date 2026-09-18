'use client';

import { useMemo, useState } from 'react';
import CodingProblemCard from '@/components/CodingProblemCard';
import type { CodingProblemSummary } from '@/data/codingProblems';
import styles from './styles.module.css';

const ALL_CATEGORY = '__all__';
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

function difficultyLabel(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

// Canonical DSA-pattern order the user expects the category filter in — not
// alphabetical, not DB insertion order (the content-migration script's
// orderIndex doesn't follow this sequence). Matched against categoryLabel;
// any category not in this list (arrays, bst, design, graph-algorithms,
// linked-list, math, matrix-traversal, simulation, string-algorithms, ...)
// is appended after it, alphabetically.
const CATEGORY_ORDER = [
  'Two Pointers', 'Sliding Window', 'Binary Search', 'Prefix Sum',
  'Hashing / Frequency Map', 'Fast & Slow Pointers', 'Merge Intervals',
  'Monotonic Stack / Queue', 'BFS / DFS', 'Backtracking', 'Greedy',
  'Dynamic Programming (DP)', 'Heap / Priority Queue', 'Union Find (DSU)',
  'Topological Sort', 'Trie', 'Bit Manipulation',
];
const CATEGORY_RANK = new Map(CATEGORY_ORDER.map((label, i) => [label, i]));

function compareCategoryLabels(a: string, b: string): number {
  const rankA = CATEGORY_RANK.get(a);
  const rankB = CATEGORY_RANK.get(b);
  if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;
  return a.localeCompare(b);
}

// Tag-cloud font-size steps, keyed by how a category's problem count ranks
// against the others (0 = most-populated category) — biggest category gets
// the biggest pill, same idea as a classic word cloud.
const CLOUD_SIZE_STEPS = [styles.cloudSize0, styles.cloudSize1, styles.cloudSize2, styles.cloudSize3];

/**
 * Two-column layout for the Practice Coding catalog: the numbered problem
 * list on the left, and filters on the right as a tag cloud — category
 * pills sized by how many problems they hold, plus Easy/Medium/Hard pills.
 * No tabs — category is single-select, difficulty is multi-select, both
 * combine and update the same list in place.
 */
export default function CodingProblemsBoard({
  problems,
  bookmarkedIds,
}: {
  problems: CodingProblemSummary[];
  bookmarkedIds: string[];
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
  const cloudSizeByCategory = useMemo(() => {
    const ranked = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const sizeByCount = new Map<number, string>();
    let step = 0;
    for (const [, count] of ranked) {
      if (!sizeByCount.has(count)) {
        sizeByCount.set(count, CLOUD_SIZE_STEPS[Math.min(step, CLOUD_SIZE_STEPS.length - 1)]);
        step++;
      }
    }
    const byCategory = new Map<string, string>();
    for (const [key, count] of categoryCounts) byCategory.set(key, sizeByCount.get(count) ?? styles.cloudSize3);
    return byCategory;
  }, [categoryCounts]);

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
    return <p className={styles.emptyText}>No coding problems published yet.</p>;
  }

  const activeCategoryLabel = currentCategory === ALL_CATEGORY ? null : categories.find(([key]) => key === currentCategory)?.[1] ?? null;

  return (
    <div className={styles.layout}>
      <div className={styles.results}>
        <div className={styles.resultsHeader}>
          {activeCategoryLabel ? (
            <button type="button" className={styles.categoryChip} onClick={() => setActiveCategory(ALL_CATEGORY)}>
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
          <p className={styles.emptyText}>No problems match these filters.</p>
        ) : activeCategoryLabel ? (
          visibleByDifficulty.map(([difficulty, items]) => (
            <div key={difficulty} className={styles.categorySection}>
              <h2 className={`${styles.categorySectionHeading} ${styles[`difficultyHeading${difficultyLabel(difficulty)}`]}`}>
                {difficultyLabel(difficulty)}
              </h2>
              <ul className={styles.list}>
                {items.map((problem, i) => (
                  <li key={problem.id} className={styles.item}>
                    <CodingProblemCard problem={problem} bookmarked={bookmarkedIds.includes(problem.id)} index={i + 1} />
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
                    <CodingProblemCard problem={problem} bookmarked={bookmarkedIds.includes(problem.id)} index={i + 1} />
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
            <button
              type="button"
              className={`${styles.pill} ${styles.cloudSize2} ${currentCategory === ALL_CATEGORY ? styles.pillActive : ''}`}
              aria-pressed={currentCategory === ALL_CATEGORY}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
            >
              All
              <span className={styles.pillCount}>{problems.length}</span>
            </button>
            {categories.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`${styles.pill} ${cloudSizeByCategory.get(key) ?? styles.cloudSize3} ${currentCategory === key ? styles.pillActive : ''}`}
                aria-pressed={currentCategory === key}
                onClick={() => setActiveCategory(key)}
              >
                {label}
                <span className={styles.pillCount}>{categoryCounts.get(key) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
