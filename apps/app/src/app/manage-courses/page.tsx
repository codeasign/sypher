'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import CourseEditor from '@/components/CourseEditor';
import CourseWorkspace from '@/components/CourseWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { listCourses, deleteCourse } from '@/data/courses';
import { ManageCoursesIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import styles from './manage-courses.module.css';

interface CourseSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published';
  updated_at: string;
  published_at: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TrashIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ManageIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const MANAGE_COURSES_KEY = 'manageCourses';

function ManageCoursesContent(): React.JSX.Element {
  const { supabase } = useAuth();
  const { mutate } = useSWRConfig();
  const [pendingDelete, setPendingDelete] = useState<CourseSummary | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'workspace'>('list');
  const [workspaceCourse, setWorkspaceCourse] = useState<CourseSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const swrKey = supabase ? MANAGE_COURSES_KEY : null;
  const {
    data: courses = [],
    isLoading: loading,
    error: swrError,
    mutate: refetch,
  } = useSWR<CourseSummary[]>(swrKey, () => listCourses(supabase));
  const error =
    actionError ??
    (!supabase
      ? 'Auth is not configured. Check Supabase environment variables.'
      : swrError
      ? 'Failed to load courses.'
      : null);

  useEffect(() => {
    trackEvent('managecourses_page_view');
  }, []);

  function openNew(): void {
    trackEvent('managecourses_create_click');
    setMode('new');
  }

  function openWorkspace(course: CourseSummary): void {
    trackEvent('managecourses_workspace_open', { course_id: course.id });
    setWorkspaceCourse(course);
    setMode('workspace');
  }

  function backToList(): void {
    setMode('list');
    setWorkspaceCourse(null);
  }

  async function handleNewCourseSaved(): Promise<void> {
    await mutate(MANAGE_COURSES_KEY);
    backToList();
  }

  function handleCourseUpdated(updated: CourseSummary): void {
    setWorkspaceCourse(updated);
    mutate(MANAGE_COURSES_KEY);
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    trackEvent('managecourses_delete_confirm', { course_id: target.id });
    setPendingDelete(null);
    setActionError(null);
    const { error: deleteError } = await deleteCourse(supabase, target.id);
    if (deleteError) {
      setActionError(deleteError);
      return;
    }
    mutate(MANAGE_COURSES_KEY, courses.filter((c) => c.id !== target.id), false);
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => { setActionError(null); refetch(); }}>
            Retry
          </button>
        </div>
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
        <button type="button" className={styles.newCourseBtn} onClick={openNew}>
          <PlusIcon />
          New Course
        </button>
      </div>

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
              <span className={styles.tableCell}>{formatDate(course.updated_at)}</span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Manage course"
                  aria-label={`Manage ${course.name}`}
                  onClick={() => openWorkspace(course)}
                >
                  <ManageIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Delete course"
                  aria-label={`Delete ${course.name}`}
                  onClick={() => setPendingDelete(course)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete course?"
        message={pendingDelete ? `"${pendingDelete.name}" and all of its modules will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function ManageCoursesPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Manage Courses" description="Create, edit, and gate authored courses.">
      <RequireNavAccess itemKey="manage-course-authoring">
        <ManageCoursesContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
