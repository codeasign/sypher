'use client';

import React, { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Course } from '@/data/courses';
import CourseEditor from './CourseEditor';
import CourseWorkspace from './CourseWorkspace';
import { ManageCoursesIcon } from '@/components/icons/SidebarIcons';
import { EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import Pagination from '@/components/Pagination';
import TableSearchBar from '@/components/TableSearchBar';
import styles from './manage-courses.module.css';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Fetches the full course set once (via a high limit on the paginated
// endpoint) and does search + pagination entirely client-side — no
// network round trip per keystroke or page change (user's explicit call
// 2026-08-27). Course counts are small enough for this to be cheap.
export default function ManageCoursesContent({ initialCourses }: { initialCourses: Course[] }): React.JSX.Element {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'list' | 'new' | 'workspace'>('list');
  const [workspaceCourse, setWorkspaceCourse] = useState<Course | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? courses.filter((c) => c.name.toLowerCase().includes(q)) : courses;
  }, [courses, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string): void {
    setSearch(value);
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

  function handleCourseUpdated(updated: Course): void {
    setWorkspaceCourse(updated);
    refetch();
  }

  async function handleDelete(course: Course): Promise<void> {
    if (!window.confirm(`"${course.name}" and all of its modules will be permanently deleted.`)) return;
    setActionError(null);
    const res = await apiFetch(`/courses/${course.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.message ?? 'Failed to delete course.');
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== course.id));
  }

  if (mode === 'new') {
    return (
      <div className={styles.container}>
        <CourseEditor onSaved={handleNewCourseSaved} onCancel={backToList} onBack={backToList} />
      </div>
    );
  }

  if (mode === 'workspace' && workspaceCourse) {
    return (
      <div className={styles.container}>
        <CourseWorkspace course={workspaceCourse} onBack={backToList} onCourseUpdated={handleCourseUpdated} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ManageCoursesIcon />
          </div>
          <div>
            <h1 className={styles.heading}>Manage Courses</h1>
            <p className={styles.subtitle}>Create, edit, and gate authored courses.</p>
          </div>
        </div>
        <button type="button" className={styles.newBtn} onClick={openNew}>
          + New Course
        </button>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No courses yet. Create your first one.</p>
        </div>
      ) : (
        <>
          <TableSearchBar value={search} onChange={handleSearchChange} placeholder="Search courses by name…" />
          {visible.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No courses match &quot;{search}&quot;.</p>
            </div>
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
                    <div className={styles.titleCell}>
                      <span>{course.name}</span>
                    </div>
                    <span className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${course.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </span>
                    <span className={styles.tableCell}>{formatDate(course.updatedAt)}</span>
                    <div className={styles.actions}>
                      <Tooltip label="Manage course">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Manage course" onClick={() => openWorkspace(course)}>
                          <EditIcon />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete course">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete course" onClick={() => handleDelete(course)}>
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
    </div>
  );
}
