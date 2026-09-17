'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { approveModuleEditRequest, rejectModuleEditRequest, type ModuleEditRequest } from '@/data/moduleEditRequests';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from './styles.module.css';

const CourseModuleArticle = dynamic(() => import('@/components/CourseModulePage/CourseModuleArticle'), {
  ssr: false,
  loading: () => <p className={styles.emptyText}>Loading preview…</p>,
});

interface CourseGroup {
  courseId: string;
  courseName: string;
  requests: ModuleEditRequest[];
}

function groupByCourse(requests: ModuleEditRequest[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();
  for (const req of requests) {
    let group = map.get(req.courseId);
    if (!group) {
      group = { courseId: req.courseId, courseName: req.course.name, requests: [] };
      map.set(req.courseId, group);
    }
    group.requests.push(req);
  }
  return [...map.values()].sort((a, b) => a.courseName.localeCompare(b.courseName));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Two-pane master/detail (same layout convention as /bookmarks' Modules
// tab, user request 2026-09-16): left is a course-grouped list of pending
// Reviewer edit requests, right is the proposed content rendered as it
// will read live, with Approve/Reject.
export default function CourseAuditContent({ initialRequests }: { initialRequests: ModuleEditRequest[] }): React.JSX.Element {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const groups = useMemo(() => groupByCourse(requests), [requests]);
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  async function handleApprove(): Promise<void> {
    if (!selected) return;
    setActing(true);
    setError(null);
    const { error: approveError } = await approveModuleEditRequest(selected.id);
    setActing(false);
    if (approveError) {
      setError(approveError);
      return;
    }
    showToast(`"${selected.module.title}" is now live.`, 'success');
    setRequests((prev) => prev.filter((r) => r.id !== selected.id));
    setSelectedId(null);
  }

  async function handleReject(): Promise<void> {
    if (!selected) return;
    setActing(true);
    setError(null);
    const { error: rejectError } = await rejectModuleEditRequest(selected.id);
    setActing(false);
    if (rejectError) {
      setError(rejectError);
      return;
    }
    showToast(`"${selected.module.title}" edit rejected.`, 'error');
    setRequests((prev) => prev.filter((r) => r.id !== selected.id));
    setSelectedId(null);
  }

  if (requests.length === 0) {
    return (
      <div className={styles.detailEmpty}>
        <p className={styles.detailEmptyTitle}>No pending edits.</p>
        <p className={styles.detailEmptyText}>Reviewer-submitted content changes will show up here for approval.</p>
      </div>
    );
  }

  return (
    <div className={styles.pane}>
      <nav className={styles.menu} aria-label="Pending course edits">
        {groups.map((group) => (
          <div key={group.courseId} className={styles.menuGroup}>
            <p className={styles.menuGroupTitle}>{group.courseName}</p>
            <ul className={styles.menuList}>
              {group.requests.map((req) => (
                <li key={req.id}>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${req.id === selectedId ? styles.menuItemActive : ''}`}
                    aria-current={req.id === selectedId}
                    onClick={() => {
                      setSelectedId(req.id);
                      setError(null);
                    }}
                  >
                    <span>{req.module.title}</span>
                    <span className={styles.menuItemMeta}>
                      {req.requestedBy.fullName ?? req.requestedBy.email} · {formatDate(req.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.detail}>
        {!selected ? (
          <div className={styles.detailEmpty}>
            <p className={styles.detailEmptyTitle}>Select a pending edit</p>
            <p className={styles.detailEmptyText}>Pick one from the list to review its proposed content.</p>
          </div>
        ) : (
          <>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>{selected.module.title}</h2>
                <p className={styles.detailMeta}>
                  Submitted by {selected.requestedBy.fullName ?? selected.requestedBy.email} on {formatDate(selected.createdAt)}
                </p>
              </div>
              <div className={styles.detailActions}>
                <button type="button" className={styles.rejectBtn} onClick={handleReject} disabled={acting}>
                  Reject
                </button>
                <button type="button" className={styles.approveBtn} onClick={handleApprove} disabled={acting}>
                  {acting ? 'Working…' : 'Approve'}
                </button>
              </div>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.articleWrap}>
              <CourseModuleArticle title={selected.module.title} content={selected.proposedBodyMdx} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
