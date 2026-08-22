'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { listCourseModules, deleteCourseModule, reorderCourseModule, type CourseModule } from '@/data/courses';
import ModuleEditor from './ModuleEditor';
import { EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import styles from './manage-courses.module.css';

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

interface ModulesTabProps {
  courseId: string;
}

export default function ModulesTab({ courseId }: ModulesTabProps): React.JSX.Element {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refetch(): Promise<void> {
    setModules(await listCourseModules(courseId));
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function openNew(): void {
    setEditingModule(null);
    setMode('new');
  }

  function openEdit(mod: CourseModule): void {
    setEditingModule(mod);
    setMode('edit');
  }

  function backToList(): void {
    setMode('list');
    setEditingModule(null);
  }

  async function handleSaved(): Promise<void> {
    await refetch();
    backToList();
  }

  async function handleReorder(mod: CourseModule, direction: 'up' | 'down'): Promise<void> {
    setActionError(null);
    const { error } = await reorderCourseModule(courseId, mod.id, direction);
    if (error) {
      setActionError(error);
      return;
    }
    await refetch();
  }

  async function handleDelete(mod: CourseModule): Promise<void> {
    if (!window.confirm(`"${mod.title}" will be permanently deleted.`)) return;
    setActionError(null);
    const { error } = await deleteCourseModule(courseId, mod.id);
    if (error) {
      setActionError(error);
      return;
    }
    setModules((prev) => prev.filter((m) => m.id !== mod.id));
  }

  if (mode !== 'list') {
    return <ModuleEditor courseId={courseId} module={editingModule} onSaved={handleSaved} onCancel={backToList} onBack={backToList} />;
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading modules...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <p className={styles.subtitle}>Modules appear on the course home page in this order.</p>
        <button type="button" className={styles.newBtn} onClick={openNew}>
          + New Module
        </button>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

      {modules.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No modules yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          {modules.map((mod, index) => (
            <div key={mod.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className={styles.titleCell}>
                <span>{mod.title}</span>
                <div className={styles.badgeRow}>
                  <span className={clsx(styles.badge, mod.authoringMode === 'generated' ? styles.badgeGenerated : styles.badgeManual)}>
                    {mod.authoringMode === 'generated' ? 'Generated' : 'Manual'}
                  </span>
                  {mod.showInGettingStarted && <span className={clsx(styles.badge, styles.badgeGettingStarted)}>Getting Started</span>}
                </div>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.actionBtn} title="Move up" onClick={() => handleReorder(mod, 'up')} disabled={index === 0}>
                  <UpIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Move down"
                  onClick={() => handleReorder(mod, 'down')}
                  disabled={index === modules.length - 1}
                >
                  <DownIcon />
                </button>
                <button type="button" className={styles.actionBtn} title="Edit module" onClick={() => openEdit(mod)}>
                  <EditIcon />
                </button>
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Delete module" onClick={() => handleDelete(mod)}>
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
