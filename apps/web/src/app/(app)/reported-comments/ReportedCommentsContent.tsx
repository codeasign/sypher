'use client';

import { useState } from 'react';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast/ToastProvider';
import {
  listReportedComments,
  removeReportedComment,
  resolveReportedComment,
  type ReportedCommentListData,
  type ReportFilter,
} from '@/data/commentReports';
import styles from '../manage-courses/manage-courses.module.css';

const FILTER_TABS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportedCommentsContent({
  initialData,
  pageSize,
}: {
  initialData: ReportedCommentListData;
  pageSize: number;
}): React.JSX.Element {
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportedCommentListData>(initialData);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ReportedCommentListData['items'][number] | null>(null);
  const { showToast } = useToast();

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  async function refresh(nextFilter: ReportFilter, nextPage: number): Promise<void> {
    setLoading(true);
    setActionError(null);
    const result = await listReportedComments(nextFilter, nextPage, pageSize);
    setLoading(false);
    if (result.error || !result.data) {
      setActionError(result.error ?? 'Failed to load reported comments.');
      return;
    }
    setData(result.data);
  }

  function handleFilterChange(next: ReportFilter): void {
    setFilter(next);
    setPage(1);
    void refresh(next, 1);
  }

  function handlePageChange(next: number): void {
    setPage(next);
    void refresh(filter, next);
  }

  async function handleResolveToggle(commentId: string, resolved: boolean): Promise<void> {
    setActionError(null);
    const result = await resolveReportedComment(commentId, resolved);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    showToast(resolved ? 'Report marked resolved.' : 'Report reopened.', 'success');
    void refresh(filter, page);
  }

  async function confirmRemove(): Promise<void> {
    if (!removeTarget) return;
    setActionError(null);
    const result = await removeReportedComment(removeTarget.id);
    setRemoveTarget(null);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    showToast('Comment removed and logged.', 'error');
    void refresh(filter, page);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Reported Comments</h1>
            <p className={styles.subtitle}>Review comments flagged by users across courses, blog posts, and videos.</p>
          </div>
        </div>
      </div>

      {actionError && <p className={styles.errorText}>{actionError}</p>}

      <div className={`${styles.tabBar} ${styles.statusTabs}`} role="tablist" aria-label="Report status">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={filter === tab.value}
            className={`${styles.tab} ${filter === tab.value ? styles.tabActive : ''}`}
            onClick={() => handleFilterChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          illustration="folder"
          compact
          title={filter === 'open' ? 'No open reports.' : filter === 'resolved' ? 'No resolved reports yet.' : 'No reported comments.'}
          description={filter === 'open' ? "You're all caught up." : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <div className={styles.tableHeader} style={{ gridTemplateColumns: '3fr 1.5fr 0.6fr 1fr 1.4fr' }}>
              <span>Comment</span>
              <span>Location</span>
              <span>Reports</span>
              <span>Posted</span>
              <span>Actions</span>
            </div>
            {data.items.map((item) => (
              <div key={item.id} className={styles.tableRow} style={{ gridTemplateColumns: '3fr 1.5fr 0.6fr 1fr 1.4fr' }}>
                <div className={styles.titleCell}>
                  <span>{item.body.length > 140 ? `${item.body.slice(0, 140)}…` : item.body}</span>
                  <span className={styles.tableCell}>@{item.author.username}</span>
                </div>
                <span className={styles.tableCell}>
                  <a href={item.target.href} target="_blank" rel="noopener noreferrer">
                    {item.target.label}
                  </a>
                </span>
                <span className={styles.tableCell}>{item.reportCount}</span>
                <span className={styles.tableCell}>{formatDate(item.createdAt)}</span>
                <div className={styles.actions}>
                  {item.isRemovedByModerator ? (
                    <span className={styles.tableCell}>
                      Removed{item.lastRemoval ? ` by ${item.lastRemoval.removedBy} on ${formatDate(item.lastRemoval.removedAt)}` : ''}
                    </span>
                  ) : (
                    <>
                      <button type="button" className={styles.cancelBtn} onClick={() => void handleResolveToggle(item.id, !item.isReportResolved)}>
                        {item.isReportResolved ? 'Reopen' : 'Resolve'}
                      </button>
                      <button type="button" className={styles.deleteConfirmBtn} onClick={() => setRemoveTarget(item)}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} />
        </>
      )}

      {removeTarget && (
        <div className={styles.deleteModalOverlay} onClick={() => setRemoveTarget(null)} role="presentation">
          <div className={styles.deleteModalPanel} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              <h2 className={styles.deleteModalTitle}>Remove this comment?</h2>
              <button type="button" className={styles.deleteModalCloseBtn} onClick={() => setRemoveTarget(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className={styles.deleteModalBody}>
              <p className={styles.deleteModalWarning}>
                It will be replaced everywhere with &quot;This comment was deleted by an admin.&quot; The original text and author (
                <span className={styles.deleteModalCourseName}>@{removeTarget.author.username}</span>) stay recorded in the moderation
                audit log. This cannot be undone from here.
              </p>
            </div>
            <div className={styles.deleteModalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setRemoveTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.deleteConfirmBtn} onClick={() => void confirmRemove()}>
                Remove comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
