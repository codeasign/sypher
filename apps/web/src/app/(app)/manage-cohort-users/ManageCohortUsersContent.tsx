'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RestoreIcon, RemoveIcon } from '@/components/icons/ActionIcons';
import Tooltip from '@/components/Tooltip';
import {
  listManageableCohorts,
  listCohortRoster,
  setCohortMemberStatus,
  listCohortCoursePool,
  listCohortMemberCourseAccess,
  setCohortMemberCourseAccess,
  lookupUserByEmail,
  type Cohort,
  type RosterEntry,
} from '@/data/cohorts';
import courses from '@sypher/course-catalog/src/courses';
import styles from './manage-cohort-users.module.css';

const COURSE_TITLE_BY_SLUG: Record<string, string> = Object.fromEntries(
  (courses as { docsSlug: string; title: string }[]).map((c) => [c.docsSlug, c.title]),
);

/**
 * Replaces the old email-invite modal (inviteCohortMember/pending_invites +
 * Supabase magic-link signInWithOtp) — that flow depends on the deferred
 * Brevo/Resend rotation wiring and a magic-link auth concept that doesn't
 * exist in the new password/Google auth system, so it's explicitly out of
 * scope for this port. This adds an EXISTING, already-registered account to
 * the roster by email (mirrors the Launch Cohort "add manager by email"
 * flow) rather than sending a new invite to someone who doesn't have an
 * account yet. Inviting brand-new cohort members is a follow-up once the
 * general invite-consumption flow gets built.
 */
function AddMemberModal({ cohortId, onClose, onAdded }: { cohortId: string; onClose: () => void; onAdded: () => void }): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    const profile = await lookupUserByEmail(email.trim());
    if (!profile) {
      setError('No account found with that email — they need to register first.');
      setSending(false);
      return;
    }
    const { error: statusError } = await setCohortMemberStatus(cohortId, profile.id, true);
    setSending(false);
    if (statusError) {
      setError(statusError);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="add-member-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="add-member-title" className={styles.modalTitle}>Add Cohort Member</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <label className={styles.fieldLabel} htmlFor="add-member-email">Email (must already have an account)</label>
            <input
              id="add-member-email"
              type="email"
              required
              className={styles.textInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
            {error && <p className={styles.formError}>{error}</p>}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={sending || !email.trim()}>
              {sending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CourseAccessModal({
  member,
  coursePool,
  grantedSlugs,
  onClose,
  onToggle,
}: {
  member: RosterEntry;
  coursePool: string[];
  grantedSlugs: Set<string>;
  onClose: () => void;
  onToggle: (slug: string, checked: boolean) => void;
}): React.JSX.Element {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="course-access-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="course-access-title" className={styles.modalTitle}>
            {member.fullName || member.email} — Course Access
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.modalBody}>
          {coursePool.length === 0 ? (
            <p className={styles.errorText}>
              This cohort doesn&apos;t have any courses in its pool yet — ask an admin to add some from Launch Cohort&apos;s Course Pool &amp; Managers.
            </p>
          ) : (
            coursePool.map((slug) => (
              <div key={slug} className={styles.modalItemRow}>
                <span className={styles.itemLabel}>{COURSE_TITLE_BY_SLUG[slug] ?? slug}</span>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={grantedSlugs.has(slug)}
                  onChange={(e) => onToggle(slug, e.target.checked)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManageCohortUsersContent(): React.JSX.Element {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [members, setMembers] = useState<RosterEntry[]>([]);
  const [coursePool, setCoursePool] = useState<string[]>([]);
  const [memberCourses, setMemberCourses] = useState<Record<string, string[]>>({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [courseModalFor, setCourseModalFor] = useState<RosterEntry | null>(null);
  const [pendingRemove, setPendingRemove] = useState<RosterEntry | null>(null);
  const [courseErrorByUserId, setCourseErrorByUserId] = useState<Record<string, string>>({});

  useEffect(() => {
    listManageableCohorts().then((rows) => {
      setCohorts(rows);
      setCohortsLoading(false);
      if (rows.length > 0) setSelectedCohortId(rows[0].id);
    });
  }, []);

  async function refetchRoster(): Promise<void> {
    if (!selectedCohortId) return;
    setRosterLoading(true);
    const [rosterRows, poolRows, memberCourseRows] = await Promise.all([
      listCohortRoster(selectedCohortId),
      listCohortCoursePool(selectedCohortId),
      listCohortMemberCourseAccess(selectedCohortId),
    ]);
    const byUser: Record<string, string[]> = {};
    for (const row of memberCourseRows) {
      (byUser[row.userId] ??= []).push(row.courseSlug);
    }
    setMembers(rosterRows);
    setCoursePool(poolRows);
    setMemberCourses(byUser);
    setRosterLoading(false);
  }

  useEffect(() => {
    refetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCohortId]);

  const memberCoursesSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [userId, slugs] of Object.entries(memberCourses)) {
      map.set(userId, new Set(slugs));
    }
    return map;
  }, [memberCourses]);

  async function handleSetActive(member: RosterEntry, active: boolean): Promise<void> {
    if (!selectedCohortId) return;
    setActionError(null);
    const { error: updateError } = await setCohortMemberStatus(selectedCohortId, member.userId, active);
    if (updateError) {
      setActionError(updateError);
      return;
    }
    refetchRoster();
  }

  async function confirmRemove(): Promise<void> {
    if (!pendingRemove) return;
    const target = pendingRemove;
    setPendingRemove(null);
    await handleSetActive(target, false);
  }

  async function handleToggleCourse(member: RosterEntry, slug: string, checked: boolean): Promise<void> {
    if (!selectedCohortId) return;
    setCourseErrorByUserId((p) => ({ ...p, [member.userId]: '' }));
    const { error: toggleError } = await setCohortMemberCourseAccess(selectedCohortId, member.userId, slug, checked);
    if (toggleError) {
      setCourseErrorByUserId((p) => ({ ...p, [member.userId]: toggleError }));
      return;
    }
    refetchRoster();
  }

  if (cohortsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading cohorts...</p>
        </div>
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>You don&apos;t manage any cohorts yet. Ask an admin to add you as a manager from Launch Cohort&apos;s Course Pool &amp; Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <h1 className={styles.heading}>Manage Cohort Users</h1>
            <p className={styles.subtitle}>Add cohort members and control their course access.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.cohortSelect}
            value={selectedCohortId ?? ''}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            aria-label="Select cohort"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </select>
          <button type="button" className={styles.inviteBtn} disabled={!selectedCohortId} onClick={() => setAddOpen(true)}>
            + Add Member
          </button>
        </div>
      </div>

      {actionError && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{actionError}</p>
        </div>
      )}

      {rosterLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading roster...</p>
        </div>
      ) : members.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No members yet. Add your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Member</span>
            <span>Status</span>
            <span>Course Access</span>
            <span>Actions</span>
          </div>
          {members.map((member) => {
            const grantedSlugs = memberCoursesSets.get(member.userId) ?? new Set<string>();
            const removed = member.status === 'removed';
            return (
              <div key={member.userId} className={styles.tableRow}>
                <div className={styles.userCell}>
                  <span className={styles.userName}>{member.fullName || member.email}</span>
                  {member.fullName && <span className={styles.userEmail}>{member.email}</span>}
                </div>
                <span className={styles.tableCell}>
                  {/* Status-badge rule: modifier class carries the semantic fill —
                      without it .statusBadge renders transparent. */}
                  <span className={`${styles.statusBadge} ${removed ? styles.statusRemoved : styles.statusActive}`}>
                    {removed ? 'Removed' : 'Active'}
                  </span>
                </span>
                <span className={styles.tableCell}>
                  <button type="button" className={styles.courseAccessBtn} disabled={removed} onClick={() => setCourseModalFor(member)}>
                    {grantedSlugs.size} of {coursePool.length} courses
                  </button>
                  {courseErrorByUserId[member.userId] && <p className={styles.rowError}>{courseErrorByUserId[member.userId]}</p>}
                </span>
                <div className={styles.actions}>
                  {removed ? (
                    <Tooltip label="Re-add member">
                      <button type="button" className={`${styles.actionBtn} ${styles.actionBtnSuccess}`} aria-label="Re-add member" onClick={() => handleSetActive(member, true)}>
                        <RestoreIcon />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip label="Remove member">
                      <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Remove member" onClick={() => setPendingRemove(member)}>
                        <RemoveIcon />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && selectedCohortId && (
        <AddMemberModal cohortId={selectedCohortId} onClose={() => setAddOpen(false)} onAdded={() => refetchRoster()} />
      )}

      {courseModalFor && (
        <CourseAccessModal
          member={courseModalFor}
          coursePool={coursePool}
          grantedSlugs={memberCoursesSets.get(courseModalFor.userId) ?? new Set<string>()}
          onClose={() => setCourseModalFor(null)}
          onToggle={(slug, checked) => handleToggleCourse(courseModalFor, slug, checked)}
        />
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove member?"
        message={pendingRemove ? `${pendingRemove.fullName || pendingRemove.email} will lose access to all their granted courses for this cohort. This can be undone with Re-add, but course access will need to be re-granted.` : ''}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
