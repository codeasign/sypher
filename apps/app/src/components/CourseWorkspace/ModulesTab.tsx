'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModuleEditor from '@/components/ModuleEditor';
import { listCourseModules, deleteCourseModule, reorderCourseModules } from '@/data/courses';
import { trackEvent } from '@/lib/analytics';
import styles from './ModulesTab.module.css';

interface CourseModuleRow {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  body_mdx: string;
  order_index: number;
  module_type: string;
  authoring_mode: 'manual' | 'generated';
  show_in_getting_started: boolean;
  getting_started_order: number | null;
  updated_at: string;
  created_at: string;
}

interface ModulesTabProps {
  courseId: string;
  courseSlug: string;
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function TrashIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function UpIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function DownIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

export default function ModulesTab({ courseId, courseSlug }: ModulesTabProps): React.JSX.Element {
  const { supabase } = useAuth();
  const { mutate } = useSWRConfig();
  const swrKey = supabase ? `courseModules:${courseId}` : null;
  const {
    data: modules = [],
    isLoading: loading,
    error: swrError,
    mutate: refetch,
  } = useSWR<CourseModuleRow[]>(swrKey, () => listCourseModules(supabase, courseId));

  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingModule, setEditingModule] = useState<CourseModuleRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CourseModuleRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const error = actionError ?? (swrError ? 'Failed to load modules.' : null);

  function openNew(): void {
    trackEvent('managecourses_module_create_click', { course_id: courseId });
    setEditingModule(null);
    setMode('new');
  }

  function openEdit(mod: CourseModuleRow): void {
    trackEvent('managecourses_module_edit_click', { course_id: courseId, module_id: mod.id });
    setEditingModule(mod);
    setMode('edit');
  }

  function backToList(): void {
    setMode('list');
    setEditingModule(null);
  }

  async function handleSaved(): Promise<void> {
    if (swrKey) await mutate(swrKey);
    backToList();
  }

  async function handleReorder(mod: CourseModuleRow, direction: 'up' | 'down'): Promise<void> {
    setActionError(null);
    const { error: reorderError } = await reorderCourseModules(supabase, courseId, mod.id, direction);
    if (reorderError) {
      setActionError(reorderError);
      return;
    }
    if (swrKey) await mutate(swrKey);
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    trackEvent('managecourses_module_delete_confirm', { course_id: courseId, module_id: target.id });
    setPendingDelete(null);
    setActionError(null);
    const { error: deleteError } = await deleteCourseModule(supabase, target.id);
    if (deleteError) {
      setActionError(deleteError);
      return;
    }
    if (swrKey) mutate(swrKey, modules.filter((m) => m.id !== target.id), false);
  }

  if (mode !== 'list') {
    return (
      <ModuleEditor
        courseId={courseId}
        courseSlug={courseSlug}
        module={editingModule}
        onSaved={handleSaved}
        onCancel={backToList}
        onBack={backToList}
      />
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading modules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.retryBtn} onClick={() => { setActionError(null); refetch(); }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Modules appear on the course home page in this order.</p>
        <button type="button" className={styles.newModuleBtn} onClick={openNew}>
          <PlusIcon />
          New Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No modules yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          {modules.map((mod, index) => (
            <div key={mod.id} className={styles.tableRow}>
              <div className={styles.titleCell}>
                <span>{mod.title}</span>
                <div className={styles.badgeRow}>
                  <span className={clsx(styles.badge, mod.authoring_mode === 'generated' ? styles.badgeGenerated : styles.badgeManual)}>
                    {mod.authoring_mode === 'generated' ? 'Generated' : 'Manual'}
                  </span>
                  {mod.show_in_getting_started && <span className={clsx(styles.badge, styles.badgeGettingStarted)}>Getting Started</span>}
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Move up"
                  aria-label={`Move ${mod.title} up`}
                  onClick={() => handleReorder(mod, 'up')}
                  disabled={index === 0}
                >
                  <UpIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Move down"
                  aria-label={`Move ${mod.title} down`}
                  onClick={() => handleReorder(mod, 'down')}
                  disabled={index === modules.length - 1}
                >
                  <DownIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Edit module"
                  aria-label={`Edit ${mod.title}`}
                  onClick={() => openEdit(mod)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Delete module"
                  aria-label={`Delete ${mod.title}`}
                  onClick={() => setPendingDelete(mod)}
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
        title="Delete module?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
