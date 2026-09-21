'use client';

import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, ImageOff } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Course } from '@/data/courses';
import CourseEditor from './CourseEditor';
import CourseWorkspace from './CourseWorkspace';
import { ManageCoursesIcon } from '@/components/icons/SidebarIcons';
import { EditIcon, DeleteIcon, MenuBookIcon, OpenInNewIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import Pagination from '@/components/Pagination';
import TableSearchBar from '@/components/TableSearchBar';
import { useToast } from '@/components/Toast/ToastProvider';
import EmptyState from '@/components/EmptyState';
import styles from './manage-courses.module.css';

const PAGE_SIZE = 10;
type StatusFilter = 'published' | 'draft';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

// Canonical order mirrors CourseEditor's CATEGORY_OPTIONS; any other category
// already in use follows alphabetically.
const CATEGORY_ORDER = ['tech', 'coding', 'databases', 'life-skills'];
const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = '__none__';

function categoryLabel(value: string): string {
  if (value === ALL_CATEGORIES) return 'All';
  if (value === UNCATEGORIZED) return 'Uncategorized';
  return value
    .split(/[-_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function courseCategoryKey(course: Course): string {
  return course.category?.trim() || UNCATEGORIZED;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Fetches the full course set once (via a high limit on the paginated
// endpoint) and does search + pagination entirely client-side — no
// network round trip per keystroke or page change (user's explicit call
// 2026-08-27). Course counts are small enough for this to be cheap.
export default function ManageCoursesContent({ initialCourses }: { initialCourses: Course[] }): React.JSX.Element {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const existingCategories = useMemo(() => [...new Set(courses.map((c) => c.category?.trim()).filter((c): c is string => Boolean(c)))], [courses]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('published');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'list' | 'new' | 'workspace'>('list');
  const [workspaceCourse, setWorkspaceCourse] = useState<Course | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const statusCounts = useMemo(
    () => ({
      published: courses.filter((course) => course.status === 'published').length,
      draft: courses.filter((course) => course.status === 'draft').length,
    }),
    [courses],
  );

  // Category chips: canonical categories plus any other in use, counted within
  // the active status tab so the numbers match what the list shows.
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const course of courses) {
      if (course.status !== statusFilter) continue;
      const key = courseCategoryKey(course);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const present = new Set(courses.map(courseCategoryKey));
    // Canonical categories always get a chip (0 when empty) so a new one like
    // Coding is filterable before any course is assigned to it.
    const known = CATEGORY_ORDER;
    const extras = [...present].filter((c) => c !== UNCATEGORIZED && !CATEGORY_ORDER.includes(c)).sort((a, b) => a.localeCompare(b));
    const keys = [...known, ...extras, ...(present.has(UNCATEGORIZED) ? [UNCATEGORIZED] : [])];
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    return [{ value: ALL_CATEGORIES, count: total }, ...keys.map((value) => ({ value, count: counts.get(value) ?? 0 }))];
  }, [courses, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = courses.filter((course) => course.status === statusFilter);
    if (categoryFilter !== ALL_CATEGORIES) result = result.filter((course) => courseCategoryKey(course) === categoryFilter);
    return q ? result.filter((course) => course.name.toLowerCase().includes(q)) : result;
  }, [courses, search, statusFilter, categoryFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(status: StatusFilter): void {
    setStatusFilter(status);
    setPage(1);
  }

  function handleCategoryChange(category: string): void {
    setCategoryFilter(category);
    setPage(1);
  }

  async function refetch(): Promise<void> {
    const res = await apiFetch('/courses/manage/list?limit=1000&offset=0');
    if (res.ok) {
      const result = await res.json();
      setCourses(result.courses);
      setPage(1);
    }
  }

  function openNew(): void {
    setMode('new');
  }

  function openWorkspace(course: Course): void {
    setWorkspaceCourse(course);
    setMode('workspace');
  }

  function backToList(): void {
    setMode('list');
    setWorkspaceCourse(null);
  }

  async function handleNewCourseSaved(): Promise<void> {
    await refetch();
    backToList();
  }

  // Republish returns to the list; refetch first so the row's status badge, the
  // Published/Draft tab counts and the "Updated" date reflect the change.
  async function handleRepublished(): Promise<void> {
    await refetch();
    backToList();
  }

  function handleCourseUpdated(updated: Course): void {
    setWorkspaceCourse(updated);
    refetch();
  }

  function requestDelete(course: Course): void {
    setDeleteTarget(course);
    setDeleteConfirmText('');
    setActionError(null);
  }

  function cancelDelete(): void {
    setDeleteTarget(null);
    setDeleteConfirmText('');
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;
    setDeleting(true);
    setActionError(null);
    const res = await apiFetch(`/courses/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.message ?? 'Failed to delete course.');
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    showToast(`"${deleteTarget.name}" deleted.`, 'error');
    setDeleteTarget(null);
    setDeleteConfirmText('');
  }

  if (mode === 'new') {
    return (
      <div className={styles.container}>
        <CourseEditor onSaved={handleNewCourseSaved} onCancel={backToList} onBack={backToList} existingCategories={existingCategories} />
      </div>
    );
  }

  if (mode === 'workspace' && workspaceCourse) {
    return (
      <div className={styles.container}>
        <CourseWorkspace course={workspaceCourse} onBack={backToList} onRepublished={handleRepublished} onCourseUpdated={handleCourseUpdated} existingCategories={existingCategories} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Manage Courses</h1>
            <p className={styles.subtitle}>Create, edit, and gate authored courses.</p>
          </div>
        </div>
        <button type="button" className={styles.newBtn} onClick={openNew}>
          <MenuBookIcon />
          New Course
        </button>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

      <div className={`${styles.tabBar} ${styles.statusTabs}`} role="tablist" aria-label="Course status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            className={`${styles.tab} ${statusFilter === tab.value ? styles.tabActive : ''}`}
            onClick={() => handleStatusChange(tab.value)}
          >
            {tab.label} ({statusCounts[tab.value]})
          </button>
        ))}
      </div>

      {courses.length === 0 ? (
        <EmptyState illustration="courses" compact title="No courses yet." description="Create your first one to get started." />
      ) : (
        <>
          <div className={styles.filterToolbar}>
            <div className={styles.categoryFilters} role="group" aria-label="Filter by category">
              {categoryChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={categoryFilter === chip.value}
                  className={`${styles.categoryChip} ${categoryFilter === chip.value ? styles.categoryChipActive : ''}`}
                  onClick={() => handleCategoryChange(chip.value)}
                >
                  <span className={styles.categoryDot} aria-hidden="true" />
                  {categoryLabel(chip.value)}
                  <span className={styles.categoryChipCount}>{chip.count}</span>
                </button>
              ))}
            </div>
            <TableSearchBar value={search} onChange={handleSearchChange} placeholder="Search courses by name…" />
          </div>
          {visible.length === 0 ? (
            <EmptyState
              illustration={search.trim() ? 'search' : 'courses'}
              compact
              title={
                search.trim()
                  ? `No ${statusFilter} courses match "${search}".`
                  : categoryFilter !== ALL_CATEGORIES
                    ? `No ${statusFilter} ${categoryLabel(categoryFilter)} courses.`
                    : `No ${statusFilter} courses yet.`
              }
            />
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <div className={styles.tableHeader}>
                  <span>Name</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>
                {visible.map((course) => (
                  <div key={course.id} className={styles.tableRow}>
                    <div className={styles.nameCell}>
                      {course.coverImageUrl ? (
                        <ImageIcon size={18} className={styles.coverIconPresent} aria-label="Has cover image" />
                      ) : (
                        <ImageOff size={18} className={styles.coverIconMissing} aria-label="No cover image" />
                      )}
                      <div className={styles.titleCell}>
                        <span>{course.name}</span>
                      </div>
                    </div>
                    <span className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${course.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </span>
                    <span className={styles.tableCell}>{formatDate(course.updatedAt)}</span>
                    <div className={styles.actions}>
                      {course.status === 'published' ? (
                        <Tooltip label="Open course in new tab">
                          <a
                            href={`/learn/${course.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.actionBtn}
                            aria-label="Open course in new tab"
                          >
                            <OpenInNewIcon />
                          </a>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Publish the course to open it">
                          <button type="button" className={styles.actionBtn} aria-label="Open course in new tab (unavailable for drafts)" disabled>
                            <OpenInNewIcon />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip label="Manage course">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Manage course" onClick={() => openWorkspace(course)}>
                          <EditIcon />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete course">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete course" onClick={() => requestDelete(course)}>
                          <DeleteIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}

      {deleteTarget && (
        <div className={styles.deleteModalOverlay} onClick={cancelDelete} role="presentation">
          <div
            className={styles.deleteModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteModalHeader}>
              <h2 id="delete-course-modal-title" className={styles.deleteModalTitle}>
                Delete course
              </h2>
              <button type="button" className={styles.deleteModalCloseBtn} onClick={cancelDelete} aria-label="Close" disabled={deleting}>
                ×
              </button>
            </div>
            <div className={styles.deleteModalBody}>
              <p className={styles.deleteModalWarning}>
                <span className={styles.deleteModalCourseName}>{deleteTarget.name}</span> and all of its modules will be
                permanently deleted. This cannot be undone.
              </p>
              <label className={styles.deleteModalHint} htmlFor="delete-confirm-input">
                Type <span className={styles.deleteModalCourseName}>{deleteTarget.name}</span> to confirm.
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                className={styles.deleteModalInput}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoFocus
                disabled={deleting}
              />
              {actionError && <p className={styles.errorText}>{actionError}</p>}
            </div>
            <div className={styles.deleteModalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={cancelDelete} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={confirmDelete}
                disabled={deleting || deleteConfirmText !== deleteTarget.name}
              >
                {deleting ? 'Deleting…' : 'Delete course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
