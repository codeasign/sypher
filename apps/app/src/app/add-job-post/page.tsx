'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import JobPostEditor from '@/components/JobPostEditor';
import { useAuth } from '@/contexts/AuthContext';
import { listJobPosts, listJobPostsByCreator, getJobPostById, deleteJobPost } from '@/data/jobPosts';
import styles from './add-job-post.module.css';

interface JobPostSummary {
  id: string;
  slug: string;
  title: string;
  company_name?: string | null;
  location: string | null;
  employment_type: string | null;
  status: 'draft' | 'open' | 'closed';
  updated_at: string;
  created_at: string;
}

interface JobPostFull extends JobPostSummary {
  description: string;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  apply_email: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', open: 'Open', closed: 'Closed' };
const STATUS_CLASS: Record<string, string> = { draft: 'statusDraft', open: 'statusOpen', closed: 'statusClosed' };

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

function AddJobPostContent(): React.JSX.Element {
  const { supabase, user, companyName, role } = useAuth();
  const isExternalPoster = role === 'external_job_poster';
  const [posts, setPosts] = useState<JobPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JobPostSummary | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<JobPostFull | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isExternalPoster) {
      if (!supabase || !user) {
        setError('Not signed in.');
        setLoading(false);
        return;
      }
      const data = await listJobPostsByCreator(supabase, user.id);
      setPosts(data);
      setLoading(false);
      return;
    }
    if (!supabase || !companyName) {
      setError('Your account has no company assigned. Contact an admin.');
      setLoading(false);
      return;
    }
    const data = await listJobPosts(supabase, companyName);
    setPosts(data);
    setLoading(false);
  }, [supabase, user, companyName, isExternalPoster]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function openEdit(summary: JobPostSummary): Promise<void> {
    const full = await getJobPostById(supabase, summary.id);
    if (full) {
      setEditingPost(full);
      setMode('edit');
    }
  }

  function openNew(): void {
    setEditingPost(null);
    setMode('new');
  }

  function backToList(): void {
    setMode('list');
    setEditingPost(null);
  }

  async function handleSaved(): Promise<void> {
    await fetchPosts();
    backToList();
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const { error: deleteError } = await deleteJobPost(supabase, target.id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== target.id));
  }

  if (mode !== 'list') {
    return (
      <div className={styles.container}>
        <JobPostEditor
          post={editingPost}
          onSaved={handleSaved}
          onCancel={backToList}
          onBack={backToList}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading job posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={fetchPosts}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Add Job Post</h1>
          <p className={styles.subtitle}>
            {isExternalPoster
              ? 'Create, edit, publish, and close job postings you’ve created on behalf of any company.'
              : `Create, edit, publish, and close job postings for ${companyName}.`}
          </p>
        </div>
        <button type="button" className={styles.newPostBtn} onClick={openNew}>
          <PlusIcon />
          New Job Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No job posts yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Title</span>
            <span>Location</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {posts.map((post) => (
            <div key={post.id} className={styles.tableRow}>
              <div className={styles.titleCell}>
                {isExternalPoster ? (
                  <div>
                    <span>{post.title}</span>
                    {post.company_name && <p className={styles.titleCompany}>{post.company_name}</p>}
                  </div>
                ) : (
                  <span>{post.title}</span>
                )}
              </div>
              <span className={styles.tableCell}>{post.location || '—'}</span>
              <span className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[post.status]]}`}>
                  {STATUS_LABEL[post.status]}
                </span>
              </span>
              <span className={styles.tableCell}>{formatDate(post.updated_at)}</span>
              <div className={styles.actions}>
                {post.status === 'open' && (
                  <a
                    className={styles.actionBtn}
                    title="View job post"
                    aria-label={`View ${post.title} in a new tab`}
                    href={`/careers/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon />
                  </a>
                )}
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Edit job post"
                  aria-label={`Edit ${post.title}`}
                  onClick={() => openEdit(post)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Delete job post"
                  aria-label={`Delete ${post.title}`}
                  onClick={() => setPendingDelete(post)}
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
        title="Delete job post?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function AddJobPostPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Add Job Post" description="Create, edit, publish, and close job postings.">
      <RequireNavAccess itemKey="add-job-post">
        <AddJobPostContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
