'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import CohortEditor from '@/components/CohortEditor';
import { useAuth } from '@/contexts/AuthContext';
import { listCohorts, getCohortById, deleteCohort } from '@/data/cohorts';
import { LaunchCohortIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import styles from './launch-cohort.module.css';

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

const LAUNCH_COHORT_KEY = 'launchCohorts';

function LaunchCohortContent(): React.JSX.Element {
  const { supabase } = useAuth();
  const { mutate } = useSWRConfig();
  const [pendingDelete, setPendingDelete] = useState<CohortSummary | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingCohort, setEditingCohort] = useState<CohortFull | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        <CohortEditor cohort={editingCohort} onSaved={handleSaved} onCancel={backToList} />
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
