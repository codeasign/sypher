'use client';

import React, { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import BlogPostEditor from '@/components/BlogPostEditor';
import { ViewIcon, EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import Pagination from '@/components/Pagination';
import TableSearchBar from '@/components/TableSearchBar';
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

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Fetches the full post set once (via a high limit on the paginated
// endpoint) and does search + pagination entirely client-side — no
// network round trip per keystroke or page change (user's explicit call
// 2026-08-27).
export default function ManageBlogContent({ initialPosts }: { initialPosts: BlogPostSummary[] }): React.JSX.Element {
  const [posts, setPosts] = useState<BlogPostSummary[]>(initialPosts);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BlogPostSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? posts.filter((p) => p.title.toLowerCase().includes(q)) : posts;
  }, [posts, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  async function refetch(): Promise<void> {
    const res = await apiFetch('/blog/manage/list?limit=1000&offset=0');
    if (res.ok) {
      const result = await res.json();
      setPosts(result.posts);
      setPage(1);
    }
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
        <>
          <TableSearchBar value={search} onChange={handleSearchChange} placeholder="Search posts by title…" />
          {visible.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No posts match &quot;{search}&quot;.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <div className={styles.tableHeader}>
                  <span>Title</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>
                {visible.map((post) => (
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
                        <Tooltip label="View post">
                          <a className={styles.actionBtn} aria-label="View post" href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <ViewIcon />
                          </a>
                        </Tooltip>
                      )}
                      <Tooltip label="Edit post">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Edit post" onClick={() => openEdit(post)}>
                          <EditIcon />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete post">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete post" onClick={() => handleDelete(post)}>
                          <DeleteIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}
