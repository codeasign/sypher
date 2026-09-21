'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { listCourseModules, deleteCourseModule, reorderCourseModule, type CourseModule } from '@/data/courses';
import ModuleEditor from './ModuleEditor';
import { EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import EmptyState from '@/components/EmptyState';
import styles from './manage-courses.module.css';

function UpIcon(): React.JSX.Element {
  return (
    <ArrowUp size={14} />
  );
}

function DownIcon(): React.JSX.Element {
  return (
    <ArrowDown size={14} />
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
        <EmptyState illustration="courses" compact title="No modules yet." description="Create your first one to get started." />
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
                <Tooltip label="Move up">
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnNeutral}`} aria-label="Move up" onClick={() => handleReorder(mod, 'up')} disabled={index === 0}>
                    <UpIcon />
                  </button>
                </Tooltip>
                <Tooltip label="Move down">
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnNeutral}`}
                    aria-label="Move down"
                    onClick={() => handleReorder(mod, 'down')}
                    disabled={index === modules.length - 1}
                  >
                    <DownIcon />
                  </button>
                </Tooltip>
                <Tooltip label="Edit module">
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Edit module" onClick={() => openEdit(mod)}>
                    <EditIcon />
                  </button>
                </Tooltip>
                <Tooltip label="Delete module">
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete module" onClick={() => handleDelete(mod)}>
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
