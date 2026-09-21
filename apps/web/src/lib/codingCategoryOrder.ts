import type { CodingProblemSummary } from '@/data/codingProblems';

// Canonical DSA-pattern order coding-problem categories are shown in -- not
// alphabetical, not DB insertion order (the content-migration script's
// orderIndex doesn't follow this sequence). Matched against categoryLabel;
// any category not in this list (arrays, bst, design, graph-algorithms,
// linked-list, math, matrix-traversal, simulation, string-algorithms, ...)
// is appended after it, alphabetically.
//
// Shared by the Practice Coding board and the Bookmarks "Coding Problems"
// tab so both list categories in the same order.
const CATEGORY_ORDER = [
  'Two Pointers', 'Sliding Window', 'Binary Search', 'Prefix Sum',
  'Hashing / Frequency Map', 'Fast & Slow Pointers', 'Merge Intervals',
  'Monotonic Stack / Queue', 'BFS / DFS', 'Backtracking', 'Greedy',
  'Dynamic Programming (DP)', 'Heap / Priority Queue', 'Union Find (DSU)',
  'Topological Sort', 'Trie', 'Bit Manipulation',
];
const CATEGORY_RANK = new Map(CATEGORY_ORDER.map((label, i) => [label, i]));

export function compareCategoryLabels(a: string, b: string): number {
  const rankA = CATEGORY_RANK.get(a);
  const rankB = CATEGORY_RANK.get(b);
  if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;
  return a.localeCompare(b);
}

// ---------------------------------------------------------------------------
// Category pill packing (Practice Coding filter panel)
//
// The pills flow and wrap at their natural widths, so a wide pill that doesn't
// fit at the end of a row leaves a gap. packPillsByRow keeps the canonical
// order as far as it can, but when the next pill won't fit in the current row
// it pulls a later, narrower one forward to fill the space. Widths are
// estimated (no DOM at render time, and the server and client must agree);
// the estimate is within ~3% of measured Segoe UI widths, and being off only
// means one pill wraps early -- the same as the un-packed layout.
// ---------------------------------------------------------------------------

/** Inner width of the filter panel: 380px column - 2*16px padding - 2px border. */
const PILL_ROW_WIDTH_PX = 346;
/** Gap between pills (.pillCloud gap: 0.3rem). */
const PILL_GAP_PX = 4.8;
/** Border + horizontal padding (0.6rem each side) + dot + the two inner gaps (0.3rem). */
const PILL_CHROME_PX = 2 + 2 * 9.6 + 8 + 4.8 + 4.8;
/** Average glyph width of the label font, in em per character (Segoe UI Semibold). */
const LABEL_EM_PER_CHAR = 0.49;
/** Width of one digit of the count (13.6px, tabular). */
const COUNT_PX_PER_DIGIT = 7.3;
/** Headroom so a slightly-wider real render doesn't push a pill onto the next row. */
const WIDTH_SAFETY = 1.02;

export interface PillSize {
  label: string;
  count: number;
  /** Label font size in px (the pill's cloud size step). */
  fontPx: number;
}

export function estimatePillWidth({ label, count, fontPx }: PillSize): number {
  const labelPx = LABEL_EM_PER_CHAR * label.length * fontPx;
  const countPx = COUNT_PX_PER_DIGIT * String(count).length;
  return (PILL_CHROME_PX + labelPx + countPx) * WIDTH_SAFETY;
}

/**
 * Reorders pills so rows fill up: repeatedly build a row from the remaining
 * pills in their given order, taking each one that still fits and skipping
 * (not dropping) any that don't. The first pill always stays first.
 */
export function packPillsByRow<T extends PillSize>(pills: T[]): T[] {
  const remaining = pills.map((pill) => ({ pill, width: estimatePillWidth(pill) }));
  const packed: T[] = [];
  while (remaining.length > 0) {
    let used = 0;
    let inRow = 0;
    for (let i = 0; i < remaining.length; ) {
      const need = inRow === 0 ? remaining[i].width : remaining[i].width + PILL_GAP_PX;
      // the first pill of a row is always taken, even if it alone is too wide
      if (inRow === 0 || used + need <= PILL_ROW_WIDTH_PX) {
        used += need;
        inRow++;
        packed.push(remaining.splice(i, 1)[0].pill);
      } else {
        i++;
      }
    }
  }
  return packed;
}

export interface ProblemGroup {
  category: string;
  label: string;
  items: CodingProblemSummary[];
}

/**
 * Bucket coding problems under their category. Categories follow the
 * canonical order above; problems within a category keep the Practice Coding
 * board's order (orderIndex, then title).
 */
export function groupProblemsByCategory(problems: CodingProblemSummary[]): ProblemGroup[] {
  const map = new Map<string, ProblemGroup>();
  for (const problem of problems) {
    let group = map.get(problem.category);
    if (!group) {
      group = { category: problem.category, label: problem.categoryLabel, items: [] };
      map.set(problem.category, group);
    }
    group.items.push(problem);
  }
  for (const group of map.values()) {
    group.items.sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));
  }
  return [...map.values()].sort((a, b) => compareCategoryLabels(a.label, b.label));
}
