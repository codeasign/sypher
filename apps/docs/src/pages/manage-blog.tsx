import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import RequireNavAccess from '@site/src/components/RequireNavAccess';
import ConfirmDialog from '@site/src/components/ConfirmDialog';
import BlogPostEditor from '@site/src/components/BlogPostEditor';
import { useAuth } from '@site/src/contexts/AuthContext';
import { listBlogPosts, getBlogPostById, deleteBlogPost } from '@site/src/data/blogPosts';
import styles from './manage-blog.module.css';

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  status: 'draft' | 'published';
  updated_at: string;
  published_at: string | null;
  created_at: string;
}

interface BlogPostFull extends BlogPostSummary {
  content: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TrashIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EditIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ManageBlogContent(): JSX.Element {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BlogPostSummary | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BlogPostFull | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const data = await listBlogPosts(supabase);
    setPosts(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function openEdit(summary: BlogPostSummary): Promise<void> {
    const full = await getBlogPostById(supabase, summary.id);
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
    const { error: deleteError } = await deleteBlogPost(supabase, target.id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== target.id));
  }

  if (mode !== 'list') {
    return (
      <div className={styles.container}>
        <BlogPostEditor
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
          <p>Loading posts...</p>
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
          <h1 className={styles.heading}>Manage Blog Posts</h1>
          <p className={styles.subtitle}>Draft, edit, publish, and delete blog posts.</p>
        </div>
        <button type="button" className={styles.newPostBtn} onClick={openNew}>
          <PlusIcon />
          New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No blog posts yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Title</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {posts.map((post) => (
            <div key={post.id} className={styles.tableRow}>
              <div className={styles.titleCell}>
                <span>{post.title}</span>
              </div>
              <span className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${post.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </span>
              <span className={styles.tableCell}>{formatDate(post.updated_at)}</span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Edit post"
                  aria-label={`Edit ${post.title}`}
                  onClick={() => openEdit(post)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  title="Delete post"
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
        title="Delete post?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function ManageBlogPage(): JSX.Element {
  return (
    <DashboardLayout title="Manage Blog Posts" description="Draft, edit, publish, and delete blog posts.">
      <RequireNavAccess itemKey="manage-blog-post">
        <ManageBlogContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
