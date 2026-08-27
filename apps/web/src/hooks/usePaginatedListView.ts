'use client';

import { useEffect, useState } from 'react';

export type ListViewMode = 'card' | 'list';

interface UsePaginatedListViewArgs<T> {
  initialItems: T[];
  total: number;
  pageSize: number;
  /** Fetches one page: limit=pageSize, offset=(page-1)*pageSize. */
  fetchPage: (limit: number, offset: number) => Promise<{ items: T[]; total: number }>;
  /** localStorage key for the remembered Card/List choice — must be unique per page. */
  storageKey: string;
  /** Which view renders before the remembered choice (if any) loads after mount. Must match the page's own server-rendered default so hydration doesn't mismatch. */
  defaultView?: ListViewMode;
}

interface UsePaginatedListViewResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  loadError: string | null;
  goToPage: (page: number) => void;
  viewMode: ListViewMode;
  setViewMode: (mode: ListViewMode) => void;
}

/**
 * Shared "browse a lot of things" pattern used across every logged-in
 * listing/management page (Blog, Mock Tests, My Courses, Browse Courses,
 * Manage Courses, Manage Blog): a Card/List toggle remembered per-browser
 * (where applicable), and page-based navigation (Previous/Next + page
 * numbers via components/Pagination) that fetches exactly one page from
 * the API at a time — with hundreds of rows, sending everything (and every
 * row's full payload) on first load is the actual cost worth avoiding.
 *
 * Page-based, not cumulative "Show more" — changed 2026-08-27 per explicit
 * user preference for logged-in pages: Previous/Next with page numbers,
 * not an ever-growing appended list.
 */
export function usePaginatedListView<T>({
  initialItems,
  total: initialTotal,
  pageSize,
  fetchPage,
  storageKey,
  defaultView = 'list',
}: UsePaginatedListViewArgs<T>): UsePaginatedListViewResult<T> {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ListViewMode>(defaultView);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'card' || saved === 'list') setViewModeState(saved);
    } catch {
      // localStorage unavailable (private mode, blocked) — stay on default.
    }
    // storageKey is effectively static per mounted page; re-running this on
    // every render would fight the user's in-session toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setViewMode(mode: ListViewMode): void {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      // Best-effort only — the toggle still works for this page view.
    }
  }

  async function goToPage(target: number): Promise<void> {
    const clamped = Math.min(Math.max(1, target), totalPages);
    if (clamped === page || loading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchPage(pageSize, (clamped - 1) * pageSize);
      setItems(result.items);
      setTotal(result.total);
      setPage(clamped);
    } catch {
      setLoadError('Could not load that page. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return { items, total, page, totalPages, loading, loadError, goToPage: (p) => void goToPage(p), viewMode, setViewMode };
}
