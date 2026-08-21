'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import CohortEditor from '@/components/CohortEditor';
import { useAuth } from '@/contexts/AuthContext';
import { listCohorts, getCohortById, deleteCohort } from '@/data/cohorts';
import {
  listCohortCoursePool,
  setCohortCourseAccess,
  listCohortManagers,
  addCohortManager,
  removeCohortManager,
  findProfileByEmail,
} from '@/data/cohortMembers';
import { LaunchCohortIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
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

interface CohortManager {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

interface CohortSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  seats_total: number | null;
  price_label: string | null;
  status: 'draft' | 'live' | 'closed';
  updated_at: string;
  created_at: string;
}

interface CohortFull extends CohortSummary {
  content: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', live: 'Live', closed: 'Closed' };
const STATUS_CLASS: Record<string, string> = { draft: 'statusDraft', live: 'statusLive', closed: 'statusClosed' };

function TrashIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ExternalLinkIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
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

function PlusIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UsersGearIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <circle cx="19" cy="16" r="2.5" />
      <path d="M19 12.5v.5M19 18.5v.5M15.9 14.3l.4.3M22.1 17.4l.4.3M15.9 17.7l.4-.3M22.1 15.6l.4-.3" />
    </svg>
  );
}

/* ── Course Pool & Managers modal (admin-only: sets what a cohort's roster
   CAN be granted, and who besides an admin may manage that roster). Kept
   separate from /manage-cohort-users, which is where the roster itself --
   members, invites, per-member grants bounded to this pool -- is managed by
   admin AND any delegated manager. ── */

function CohortAccessModal({
  cohort,
  onClose,
}: {
  cohort: CohortSummary;
  onClose: () => void;
}): React.JSX.Element {
  const { supabase } = useAuth();
  const [tab, setTab] = useState<'pool' | 'managers'>('pool');
  const [poolSlugs, setPoolSlugs] = useState<Set<string>>(new Set());
  const [managers, setManagers] = useState<CohortManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowError, setRowError] = useState<string>('');
  const [managerEmail, setManagerEmail] = useState('');
  const [addingManager, setAddingManager] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);

  async function loadData(): Promise<void> {
    setLoading(true);
    const [poolRows, managerRows] = await Promise.all([
      listCohortCoursePool(supabase, cohort.id),
      listCohortManagers(supabase, cohort.id) as Promise<CohortManager[]>,
    ]);
    setPoolSlugs(new Set(poolRows.map((r: { course_slug: string }) => r.course_slug)));
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
    trackEvent('launchcohort_pool_toggle', { cohort_id: cohort.id, course_slug: slug, granted: checked });

    const { error: updateError } = await setCohortCourseAccess(supabase, cohort.id, slug, checked);
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
    const profile = await findProfileByEmail(supabase, managerEmail.trim());
    if (!profile) {
      setManagerError('No account found with that email.');
      setAddingManager(false);
      return;
    }
    const { error: addError } = await addCohortManager(supabase, cohort.id, profile.id);
    setAddingManager(false);
    if (addError) {
      setManagerError(addError);
      return;
    }
    trackEvent('launchcohort_manager_add', { cohort_id: cohort.id });
    setManagerEmail('');
    loadData();
  }

  async function handleRemoveManager(userId: string): Promise<void> {
    trackEvent('launchcohort_manager_remove', { cohort_id: cohort.id });
    const { error: removeError } = await removeCohortManager(supabase, cohort.id, userId);
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
          <button
            type="button"
            className={tab === 'pool' ? `${styles.modalTab} ${styles.modalTabActive}` : styles.modalTab}
            onClick={() => setTab('pool')}
          >
            Course Pool
          </button>
          <button
            type="button"
            className={tab === 'managers' ? `${styles.modalTab} ${styles.modalTabActive}` : styles.modalTab}
            onClick={() => setTab('managers')}
          >
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
                  <div key={m.user_id} className={styles.modalItemRow}>
                    <span className={styles.itemLabel}>{m.full_name || m.email || m.user_id}</span>
                    <button type="button" className={styles.removeBtn} onClick={() => handleRemoveManager(m.user_id)}>
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

const LAUNCH_COHORT_KEY = 'launchCohorts';

function LaunchCohortContent(): React.JSX.Element {
  const { supabase, role } = useAuth();
  const isAdmin = role === 'admin';
  const { mutate } = useSWRConfig();
  const [pendingDelete, setPendingDelete] = useState<CohortSummary | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingCohort, setEditingCohort] = useState<CohortFull | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accessModalFor, setAccessModalFor] = useState<CohortSummary | null>(null);

  const swrKey = supabase ? LAUNCH_COHORT_KEY : null;
  const {
    data: cohorts = [],
    isLoading: loading,
    error: swrError,
    mutate: refetch,
  } = useSWR<CohortSummary[]>(swrKey, () => listCohorts(supabase));
  const error =
    actionError ??
    (!supabase ? 'Auth is not configured. Check Supabase environment variables.' : swrError ? 'Failed to load cohorts.' : null);

  useEffect(() => {
    trackEvent('launchcohort_page_view');
  }, []);

  async function openEdit(summary: CohortSummary): Promise<void> {
    trackEvent('launchcohort_edit_click', { cohort_id: summary.id });
    const full = await getCohortById(supabase, summary.id);
    if (full) {
      setEditingCohort(full);
      setMode('edit');
    }
  }

  function openNew(): void {
    trackEvent('launchcohort_create_click');
    setEditingCohort(null);
    setMode('new');
  }

  function backToList(): void {
    setMode('list');
    setEditingCohort(null);
  }

  async function handleSaved(): Promise<void> {
    await mutate(LAUNCH_COHORT_KEY);
    backToList();
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    trackEvent('launchcohort_delete_confirm', { cohort_id: target.id });
    setPendingDelete(null);
    setActionError(null);
    const { error: deleteError } = await deleteCohort(supabase, target.id);
    if (deleteError) {
      setActionError(deleteError);
      return;
    }
    mutate(LAUNCH_COHORT_KEY, cohorts.filter((c) => c.id !== target.id), false);
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
            <LaunchCohortIcon />
          </div>
          <div>
            <h1 className={styles.heading}>Launch Cohort</h1>
            <p className={styles.subtitle}>Create, publish, and close cohorts.</p>
          </div>
        </div>
        <button type="button" className={styles.newPostBtn} onClick={openNew}>
          <PlusIcon />
          New Cohort
        </button>
      </div>

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
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[cohort.status]]}`}>
                  {STATUS_LABEL[cohort.status]}
                </span>
              </span>
              <span className={styles.tableCell}>{cohort.start_date ? formatDate(cohort.start_date) : '—'}</span>
              <span className={styles.tableCell}>{formatDate(cohort.updated_at)}</span>
              <div className={styles.actions}>
                {cohort.status === 'live' && (
                  <a
                    className={styles.actionBtn}
                    title="View cohort"
                    aria-label={`View ${cohort.title} in a new tab`}
                    href={`/cohorts/${cohort.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon />
                  </a>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    title="Course pool & managers"
                    aria-label={`Manage course pool and delegated managers for ${cohort.title}`}
                    onClick={() => {
                      trackEvent('launchcohort_access_click', { cohort_id: cohort.id });
                      setAccessModalFor(cohort);
                    }}
                  >
                    <UsersGearIcon />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Edit cohort"
                  aria-label={`Edit ${cohort.title}`}
                  onClick={() => openEdit(cohort)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Delete cohort"
                  aria-label={`Delete ${cohort.title}`}
                  onClick={() => setPendingDelete(cohort)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accessModalFor && (
        <CohortAccessModal cohort={accessModalFor} onClose={() => setAccessModalFor(null)} />
      )}

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

export default function LaunchCohortPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Launch Cohort" description="Create, publish, and close cohorts.">
      <RequireNavAccess itemKey="launch-cohort">
        <LaunchCohortContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
