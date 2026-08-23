'use client';

import React, { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import CohortEditor from '@/components/CohortEditor';
import { ViewIcon, SettingsIcon, EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import {
  listCohorts,
  deleteCohort,
  listCohortCoursePool,
  setCohortCourseAccess,
  listCohortManagers,
  addCohortManager,
  removeCohortManager,
  lookupUserByEmail,
  type Cohort,
  type ManagerEntry,
} from '@/data/cohorts';
import courses from '@sypher/course-catalog/src/courses';
import styles from './launch-cohort.module.css';

interface CourseCatalogEntry {
  docsSlug: string;
  title: string;
  tag: string;
}

const COURSE_ITEMS: { key: string; label: string; sublabel: string }[] = (courses as CourseCatalogEntry[]).map((c) => ({
  key: c.docsSlug,
  label: c.title,
  sublabel: c.tag,
}));

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', live: 'Live', closed: 'Closed' };

// Status-badge rule: the modifier class carries the semantic fill
// (warning/success/neutral) — without it .statusBadge renders transparent.
const STATUS_CLASS: Record<string, string> = {
  draft: styles.statusDraft,
  live: styles.statusLive,
  closed: styles.statusClosed,
};

/* Course Pool & Managers modal — admin-only (matches the server's
   admin-only enforcement on both course-pool writes and manager
   read/write). Kept separate from /manage-cohort-users, which is where
   the roster itself is managed by admin AND any delegated manager. */
function CohortAccessModal({ cohort, onClose }: { cohort: Cohort; onClose: () => void }): React.JSX.Element {
  const [tab, setTab] = useState<'pool' | 'managers'>('pool');
  const [poolSlugs, setPoolSlugs] = useState<Set<string>>(new Set());
  const [managers, setManagers] = useState<ManagerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowError, setRowError] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [addingManager, setAddingManager] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);

  async function loadData(): Promise<void> {
    setLoading(true);
    const [poolRows, managerRows] = await Promise.all([
      listCohortCoursePool(cohort.id),
      listCohortManagers(cohort.id),
    ]);
    setPoolSlugs(new Set(poolRows));
    setManagers(managerRows);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleTogglePool(slug: string, checked: boolean): Promise<void> {
    const prev = poolSlugs;
    const next = new Set(prev);
    if (checked) next.add(slug); else next.delete(slug);
    setPoolSlugs(next);
    setRowError('');

    const { error: updateError } = await setCohortCourseAccess(cohort.id, slug, checked);
    if (updateError) {
      setPoolSlugs(prev);
      setRowError(updateError);
    }
  }

  async function handleAddManager(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (addingManager || !managerEmail.trim()) return;
    setAddingManager(true);
    setManagerError(null);
    const profile = await lookupUserByEmail(managerEmail.trim());
    if (!profile) {
      setManagerError('No account found with that email.');
      setAddingManager(false);
      return;
    }
    const { error: addError } = await addCohortManager(cohort.id, profile.id);
    setAddingManager(false);
    if (addError) {
      setManagerError(addError);
      return;
    }
    setManagerEmail('');
    loadData();
  }

  async function handleRemoveManager(userId: string): Promise<void> {
    const { error: removeError } = await removeCohortManager(cohort.id, userId);
    if (removeError) {
      setManagerError(removeError);
      return;
    }
    loadData();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="cohort-access-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="cohort-access-title" className={styles.modalTitle}>
            {cohort.title} — Course Pool &amp; Managers
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.modalTabs}>
          <button type="button" className={tab === 'pool' ? `${styles.modalTab} ${styles.modalTabActive}` : styles.modalTab} onClick={() => setTab('pool')}>
            Course Pool
          </button>
          <button type="button" className={tab === 'managers' ? `${styles.modalTab} ${styles.modalTabActive}` : styles.modalTab} onClick={() => setTab('managers')}>
            Managers
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading...</p>
            </div>
          ) : tab === 'pool' ? (
            <>
              <p className={styles.itemSublabel} style={{ marginBottom: '0.75rem' }}>
                Courses checked here become available for this cohort&apos;s manager(s) to assign
                to individual members from Manage Cohort Users — checking a box here doesn&apos;t
                grant anyone access on its own.
              </p>
              {COURSE_ITEMS.map((item) => (
                <div key={item.key} className={styles.modalItemRow}>
                  <div>
                    <span className={styles.itemLabel}>{item.label}</span>
                    <span className={styles.itemSublabel}>{item.sublabel}</span>
                  </div>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={poolSlugs.has(item.key)}
                    onChange={(e) => handleTogglePool(item.key, e.target.checked)}
                    aria-label={`Toggle ${item.label} in this cohort's pool`}
                  />
                </div>
              ))}
              {rowError && <p className={styles.rowError}>{rowError}</p>}
            </>
          ) : (
            <>
              <p className={styles.itemSublabel} style={{ marginBottom: '0.75rem' }}>
                Anyone added here can manage this cohort&apos;s roster from Manage Cohort Users,
                if their role is also granted the &quot;Manage Cohort Users&quot; sidebar item from
                Site Administration.
              </p>
              <form className={styles.addManagerForm} onSubmit={handleAddManager}>
                <input
                  type="email"
                  className={styles.textInput}
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="person@example.com"
                  aria-label="Manager email"
                  disabled={addingManager}
                />
                <button type="submit" className={styles.addBtn} disabled={addingManager || !managerEmail.trim()}>
                  {addingManager ? 'Adding…' : 'Add'}
                </button>
              </form>
              {managerError && <p className={styles.formError}>{managerError}</p>}
              {managers.length === 0 ? (
                <p className={styles.itemSublabel}>No delegated managers yet — only admins manage this cohort.</p>
              ) : (
                managers.map((m) => (
                  <div key={m.userId} className={styles.modalItemRow}>
                    <span className={styles.itemLabel}>{m.fullName || m.email || m.userId}</span>
                    <button type="button" className={styles.removeBtn} onClick={() => handleRemoveManager(m.userId)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LaunchCohortContent({ isAdmin }: { isAdmin: boolean }): React.JSX.Element {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Cohort | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accessModalFor, setAccessModalFor] = useState<Cohort | null>(null);

  async function refetch(): Promise<void> {
    setLoading(true);
    setCohorts(await listCohorts());
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  // openEdit reuses the row already in `cohorts` state rather than a
  // separate admin get-by-id fetch — GET /cohorts/manage/list already
  // returns full rows (including `content`), unlike the old system's
  // listCohorts() which deliberately omitted `content` from the list view
  // and needed a second getCohortById call. No such split exists here.
  function openEdit(cohort: Cohort): void {
    setEditingCohort(cohort);
    setMode('edit');
  }

  function openNew(): void {
    setEditingCohort(null);
    setMode('new');
  }

  function backToList(): void {
    setMode('list');
    setEditingCohort(null);
  }

  async function handleSaved(): Promise<void> {
    await refetch();
    backToList();
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setActionError(null);
    const { error: deleteError } = await deleteCohort(target.id);
    if (deleteError) {
      setActionError(deleteError);
      return;
    }
    setCohorts((prev) => prev.filter((c) => c.id !== target.id));
  }

  if (mode !== 'list') {
    return (
      <div className={styles.container}>
        <CohortEditor cohort={editingCohort} onSaved={handleSaved} onCancel={backToList} onBack={backToList} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading cohorts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Launch Cohort</h1>
            <p className={styles.subtitle}>Create, publish, and close cohorts.</p>
          </div>
        </div>
        <button type="button" className={styles.newPostBtn} onClick={openNew}>
          + New Cohort
        </button>
      </div>

      {actionError && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{actionError}</p>
        </div>
      )}

      {cohorts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No cohorts yet. Launch your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Title</span>
            <span>Status</span>
            <span>Start Date</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {cohorts.map((cohort) => (
            <div key={cohort.id} className={styles.tableRow}>
              <div className={styles.titleCell}>
                <span>{cohort.title}</span>
              </div>
              <span className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${STATUS_CLASS[cohort.status] ?? ''}`}>{STATUS_LABEL[cohort.status]}</span>
              </span>
              <span className={styles.tableCell}>{cohort.startDate ? formatDate(cohort.startDate) : '—'}</span>
              <span className={styles.tableCell}>{formatDate(cohort.updatedAt)}</span>
              <div className={styles.actions}>
                {cohort.status === 'live' && (
                  <Tooltip label="View cohort">
                    <a className={styles.actionBtn} aria-label="View cohort" href={`/cohorts/${cohort.slug}`} target="_blank" rel="noopener noreferrer">
                      <ViewIcon />
                    </a>
                  </Tooltip>
                )}
                {isAdmin && (
                  <Tooltip label="Course pool & managers">
                    <button type="button" className={`${styles.actionBtn} ${styles.actionBtnNeutral}`} aria-label="Course pool & managers" onClick={() => setAccessModalFor(cohort)}>
                      <SettingsIcon />
                    </button>
                  </Tooltip>
                )}
                <Tooltip label="Edit cohort">
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Edit cohort" onClick={() => openEdit(cohort)}>
                    <EditIcon />
                  </button>
                </Tooltip>
                <Tooltip label="Delete cohort">
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete cohort" onClick={() => setPendingDelete(cohort)}>
                    <DeleteIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {accessModalFor && <CohortAccessModal cohort={accessModalFor} onClose={() => setAccessModalFor(null)} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete cohort?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
