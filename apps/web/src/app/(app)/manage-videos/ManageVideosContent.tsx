'use client';

import React, { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Video } from '@/data/videos';
import VideoEditor from './VideoEditor';
import { EditIcon, DeleteIcon, VideoIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import Pagination from '@/components/Pagination';
import TableSearchBar from '@/components/TableSearchBar';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from '../manage-courses/manage-courses.module.css';

const PAGE_SIZE = 10;
type StatusFilter = 'published' | 'draft';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Same shape as ManageCoursesContent (user request 2026-09-16: "similar to
// Manage Courses") — client-side search+pagination over one fetched-once
// list, reusing manage-courses.module.css directly rather than
// duplicating an identical stylesheet.
export default function ManageVideosContent({ initialVideos }: { initialVideos: Video[] }): React.JSX.Element {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('published');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
  const { showToast } = useToast();

  const statusCounts = useMemo(
    () => ({
      published: videos.filter((v) => v.status === 'published').length,
      draft: videos.filter((v) => v.status === 'draft').length,
    }),
    [videos],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const videosForStatus = videos.filter((v) => v.status === statusFilter);
    return q ? videosForStatus.filter((v) => v.title.toLowerCase().includes(q)) : videosForStatus;
  }, [videos, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(status: StatusFilter): void {
    setStatusFilter(status);
    setPage(1);
  }

  async function refetch(): Promise<void> {
    const res = await apiFetch('/videos/manage/list?limit=1000&offset=0');
    if (res.ok) {
      const result = await res.json();
      setVideos(result.videos);
      setPage(1);
    }
  }

  function openNew(): void {
    setEditingVideo(null);
    setMode('new');
  }

  function openEdit(video: Video): void {
    setEditingVideo(video);
    setMode('edit');
  }

  function backToList(): void {
    setMode('list');
    setEditingVideo(null);
  }

  async function handleSaved(): Promise<void> {
    await refetch();
    backToList();
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setActionError(null);
    const res = await apiFetch(`/videos/${deleteTarget.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.message ?? 'Failed to delete video.');
      return;
    }
    setVideos((prev) => prev.filter((v) => v.id !== deleteTarget.id));
    showToast(`"${deleteTarget.title}" deleted.`, 'error');
    setDeleteTarget(null);
  }

  if (mode === 'new' || mode === 'edit') {
    return (
      <div className={styles.container}>
        <VideoEditor video={editingVideo} onSaved={handleSaved} onCancel={backToList} onBack={backToList} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Manage Videos</h1>
            <p className={styles.subtitle}>Upload, edit, and publish standalone videos.</p>
          </div>
        </div>
        <button type="button" className={styles.newBtn} onClick={openNew}>
          <VideoIcon />
          New Video
        </button>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

      <div className={`${styles.tabBar} ${styles.statusTabs}`} role="tablist" aria-label="Video status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            className={`${styles.tab} ${statusFilter === tab.value ? styles.tabActive : ''}`}
            onClick={() => handleStatusChange(tab.value)}
          >
            {tab.label} ({statusCounts[tab.value]})
          </button>
        ))}
      </div>

      {videos.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No videos yet. Upload your first one.</p>
        </div>
      ) : (
        <>
          <TableSearchBar value={search} onChange={handleSearchChange} placeholder="Search videos by title…" />
          {visible.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{search.trim() ? `No ${statusFilter} videos match "${search}".` : `No ${statusFilter} videos yet.`}</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <div className={styles.tableHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                  <span>Title</span>
                  <span>Category</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>
                {visible.map((video) => (
                  <div key={video.id} className={styles.tableRow} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                    <div className={styles.titleCell}>
                      <span>{video.title}</span>
                      {!video.videoUrl && <span className={styles.tableCell}>No file uploaded</span>}
                    </div>
                    <span className={styles.tableCell}>{video.category ?? '—'}</span>
                    <span className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${video.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                        {video.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </span>
                    <span className={styles.tableCell}>{formatDate(video.updatedAt)}</span>
                    <div className={styles.actions}>
                      <Tooltip label="Edit video">
                        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Edit video" onClick={() => openEdit(video)}>
                          <EditIcon />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete video">
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          aria-label="Delete video"
                          onClick={() => setDeleteTarget(video)}
                        >
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

      {deleteTarget && (
        <div className={styles.deleteModalOverlay} onClick={() => setDeleteTarget(null)} role="presentation">
          <div className={styles.deleteModalPanel} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              <h2 className={styles.deleteModalTitle}>Delete video</h2>
              <button type="button" className={styles.deleteModalCloseBtn} onClick={() => setDeleteTarget(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className={styles.deleteModalBody}>
              <p className={styles.deleteModalWarning}>
                <span className={styles.deleteModalCourseName}>{deleteTarget.title}</span> will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className={styles.deleteModalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.deleteConfirmBtn} onClick={confirmDelete}>
                Delete video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
