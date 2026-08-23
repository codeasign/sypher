'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Course } from '@/data/courses';
import CourseEditor from './CourseEditor';
import CourseWorkspace from './CourseWorkspace';
import { ManageCoursesIcon } from '@/components/icons/SidebarIcons';
import { EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import styles from './manage-courses.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ManageCoursesContent({ initialCourses }: { initialCourses: Course[] }): React.JSX.Element {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [mode, setMode] = useState<'list' | 'new' | 'workspace'>('list');
  const [workspaceCourse, setWorkspaceCourse] = useState<Course | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refetch(): Promise<void> {
    const res = await apiFetch('/courses/manage/list');
    if (res.ok) setCourses(await res.json());
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
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {courses.map((course) => (
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
      )}
    </div>
  );
}
