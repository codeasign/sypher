'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import BlogPostEditor from '@/components/BlogPostEditor';
import { ViewIcon, EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import styles from './manage-blog.module.css';

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  featuredMediaType: 'pdf' | 'youtube' | null;
  featuredMediaValue: string | null;
  content: string;
  status: 'draft' | 'published';
  updatedAt: string;
  publishedAt: string | null;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ManageBlogContent({ initialPosts }: { initialPosts: BlogPostSummary[] }): React.JSX.Element {
  const [posts, setPosts] = useState<BlogPostSummary[]>(initialPosts);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BlogPostSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refetch(): Promise<void> {
    const res = await apiFetch('/blog/manage/list');
    if (res.ok) setPosts(await res.json());
  }

  function openEdit(summary: BlogPostSummary): void {
    setEditingPost(summary);
    setMode('edit');
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
    await refetch();
    backToList();
  }

  async function handleDelete(post: BlogPostSummary): Promise<void> {
    if (!window.confirm(`"${post.title}" will be permanently deleted.`)) return;
    setActionError(null);
    const res = await apiFetch(`/blog/${post.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.message ?? 'Failed to delete post.');
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  if (mode !== 'list') {
    return (
      <div className={styles.container}>
        <BlogPostEditor post={editingPost} onSaved={handleSaved} onCancel={backToList} onBack={backToList} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Manage Blog Posts</h1>
            <p className={styles.subtitle}>Draft, edit, publish, and delete blog posts.</p>
          </div>
        </div>
        <button type="button" className={styles.newPostBtn} onClick={openNew}>
          + New Post
        </button>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

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
              <span className={styles.tableCell}>{formatDate(post.updatedAt)}</span>
              <div className={styles.actions}>
                {post.status === 'published' && (
                  <a className={styles.actionBtn} title="View post" href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                    <ViewIcon />
                  </a>
                )}
                <button type="button" className={styles.actionBtn} title="Edit post" onClick={() => openEdit(post)}>
                  <EditIcon />
                </button>
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Delete post" onClick={() => handleDelete(post)}>
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
