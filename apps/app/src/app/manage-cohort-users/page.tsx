'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  listManageableCohorts,
  listCohortRoster,
  setCohortMemberStatus,
  listCohortPendingInvites,
  inviteCohortMember,
  revokeCohortInvite,
  listCohortCoursePool,
  listCohortMemberCourseAccess,
  setCohortMemberCourseAccess,
} from '@/data/cohortMembers';
import { UsersIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import courses from '@sypher/course-catalog/src/courses';
import styles from './manage-cohort-users.module.css';

interface CohortOption {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'live' | 'closed';
}

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  status: 'active' | 'removed';
  enrolled_at: string;
  confirmed_at: string | null;
  deleted_at: string | null;
}

interface PendingInvite {
  email: string;
  invited_at: string;
}

interface RosterData {
  members: Member[];
  pendingInvites: PendingInvite[];
  coursePool: string[];
  memberCourses: Record<string, string[]>;
}

const COURSE_TITLE_BY_SLUG: Record<string, string> = Object.fromEntries(
  (courses as { docsSlug: string; title: string }[]).map((c) => [c.docsSlug, c.title])
);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function InviteMemberModal({
  cohortId,
  onClose,
  onInvited,
}: {
  cohortId: string;
  onClose: () => void;
  onInvited: () => void;
}): React.JSX.Element {
  const { supabase, user } = useAuth();
  const [name, setName] = useState('');
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
    trackEvent('managecohortusers_invite_submit');
    const result = await inviteCohortMember(supabase, { cohortId, email, fullName: name, invitedBy: user?.id });
    setSending(false);
    trackEvent('managecohortusers_invite_result', { outcome: result.outcome });
    if (result.outcome === 'error') {
      setError(result.error ?? 'Failed to send invite');
      return;
    }
    onInvited();
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="invite-member-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="invite-member-title" className={styles.modalTitle}>Invite Cohort Member</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <label className={styles.fieldLabel} htmlFor="invite-name">Name (optional)</label>
            <input
              id="invite-name"
              type="text"
              className={styles.textInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
            <label className={styles.fieldLabel} htmlFor="invite-email">Email</label>
            <input
              id="invite-email"
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
              {sending ? 'Sending…' : 'Send Invite'}
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
  member: Member;
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
            {member.full_name || member.email} — Course Access
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

function ManageCohortUsersContent(): React.JSX.Element {
  const { supabase } = useAuth();
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [courseModalFor, setCourseModalFor] = useState<Member | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const [courseErrorByUserId, setCourseErrorByUserId] = useState<Record<string, string>>({});

  const { data: cohorts = [], isLoading: cohortsLoading } = useSWR<CohortOption[]>(
    supabase ? 'manageableCohorts' : null,
    () => listManageableCohorts(supabase) as Promise<CohortOption[]>
  );

  useEffect(() => {
    if (!selectedCohortId && cohorts.length > 0) {
      setSelectedCohortId(cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  useEffect(() => {
    trackEvent('managecohortusers_page_view');
  }, []);

  const rosterKey = supabase && selectedCohortId ? (['manageCohortUsers', selectedCohortId] as const) : null;

  const { data, isLoading: rosterLoading, error: swrError, mutate: refetch } = useSWR<RosterData>(
    rosterKey,
    async () => {
      const [members, pendingInvites, poolRows, memberCourseRows] = await Promise.all([
        listCohortRoster(supabase, selectedCohortId!),
        listCohortPendingInvites(supabase, selectedCohortId!),
        listCohortCoursePool(supabase, selectedCohortId!),
        listCohortMemberCourseAccess(supabase, selectedCohortId!),
      ]);
      const memberCourses: Record<string, string[]> = {};
      for (const row of memberCourseRows) {
        (memberCourses[row.user_id] ??= []).push(row.course_slug);
      }
      return {
        members,
        pendingInvites,
        coursePool: poolRows.map((r: { course_slug: string }) => r.course_slug),
        memberCourses,
      };
    }
  );

  const memberCoursesSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [userId, slugs] of Object.entries(data?.memberCourses ?? {})) {
      map.set(userId, new Set(slugs));
    }
    return map;
  }, [data?.memberCourses]);

  async function handleSetActive(member: Member, active: boolean): Promise<void> {
    if (!selectedCohortId) return;
    trackEvent('managecohortusers_set_active', { active });
    setActionError(null);
    const { error: updateError } = await setCohortMemberStatus(supabase, selectedCohortId, member.user_id, active);
    if (updateError) {
      setActionError(updateError);
      return;
    }
    refetch();
  }

  async function confirmRemove(): Promise<void> {
    if (!pendingRemove) return;
    const target = pendingRemove;
    setPendingRemove(null);
    await handleSetActive(target, false);
  }

  async function handleRevokeInvite(email: string): Promise<void> {
    trackEvent('managecohortusers_revoke_invite');
    setActionError(null);
    const { error: revokeError } = await revokeCohortInvite(supabase, email);
    if (revokeError) {
      setActionError(revokeError);
      return;
    }
    refetch();
  }

  async function handleToggleCourse(member: Member, slug: string, checked: boolean): Promise<void> {
    if (!selectedCohortId) return;
    setCourseErrorByUserId((p) => ({ ...p, [member.user_id]: '' }));
    const { error: toggleError } = await setCohortMemberCourseAccess(supabase, selectedCohortId, member.user_id, slug, checked);
    if (toggleError) {
      setCourseErrorByUserId((p) => ({ ...p, [member.user_id]: toggleError }));
      return;
    }
    trackEvent('managecohortusers_course_toggle', { course_slug: slug, granted: checked });
    refetch();
  }

  const error =
    actionError ??
    (!supabase ? 'Not signed in.' : swrError ? 'Failed to load roster.' : null);

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

  if (!cohortsLoading && cohorts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>You don&apos;t manage any cohorts yet. Ask an admin to add you as a manager from Launch Cohort&apos;s Course Pool &amp; Managers.</p>
        </div>
      </div>
    );
  }

  const members = data?.members ?? [];
  const pendingInvites = data?.pendingInvites ?? [];
  const coursePool = data?.coursePool ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <UsersIcon />
          </div>
          <div>
            <h1 className={styles.heading}>Manage Cohort Users</h1>
            <p className={styles.subtitle}>Invite cohort members and control their course access.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.cohortSelect}
            value={selectedCohortId ?? ''}
            onChange={(e) => {
              setSelectedCohortId(e.target.value);
              trackEvent('managecohortusers_cohort_switch');
            }}
            aria-label="Select cohort"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </select>
          <button type="button" className={styles.inviteBtn} disabled={!selectedCohortId} onClick={() => setInviteOpen(true)}>
            <PlusIcon />
            Invite Member
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => { setActionError(null); refetch(); }}>
            Retry
          </button>
        </div>
      )}

      {!error && rosterLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading roster...</p>
        </div>
      ) : !error && (
        <>
          {pendingInvites.length > 0 && (
            <div className={styles.staleInvitesBanner}>
              <strong>Invites that didn&apos;t go through</strong>
              {pendingInvites.map((invite) => (
                <div key={invite.email} className={styles.staleInviteRow}>
                  <span>{invite.email} — invited {formatDate(invite.invited_at)}, but the email never sent.</span>
                  <button type="button" className={styles.staleInviteRevokeBtn} onClick={() => handleRevokeInvite(invite.email)}>
                    Revoke &amp; retry
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No members yet. Invite your first one.</p>
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
                const grantedSlugs = memberCoursesSets.get(member.user_id) ?? new Set<string>();
                const removed = member.status === 'removed';
                return (
                  <div key={member.user_id} className={styles.tableRow}>
                    <div className={styles.userCell}>
                      <span className={styles.userName}>{member.full_name || member.email}</span>
                      {member.full_name && <span className={styles.userEmail}>{member.email}</span>}
                    </div>
                    <span className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${removed ? styles.statusRemoved : member.confirmed_at ? styles.statusActive : styles.statusInvited}`}>
                        {removed ? 'Removed' : member.confirmed_at ? 'Active' : 'Invited'}
                      </span>
                    </span>
                    <span className={styles.tableCell}>
                      <button
                        type="button"
                        className={styles.courseAccessBtn}
                        disabled={removed}
                        onClick={() => setCourseModalFor(member)}
                      >
                        {grantedSlugs.size} of {coursePool.length} courses
                      </button>
                      {courseErrorByUserId[member.user_id] && <p className={styles.rowError}>{courseErrorByUserId[member.user_id]}</p>}
                    </span>
                    <div className={styles.actions}>
                      {removed ? (
                        <button type="button" className={styles.textActionBtn} onClick={() => handleSetActive(member, true)}>
                          Re-add
                        </button>
                      ) : (
                        <button type="button" className={`${styles.textActionBtn} ${styles.textActionBtnDanger}`} onClick={() => setPendingRemove(member)}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {inviteOpen && selectedCohortId && (
        <InviteMemberModal cohortId={selectedCohortId} onClose={() => setInviteOpen(false)} onInvited={() => refetch()} />
      )}

      {courseModalFor && (
        <CourseAccessModal
          member={courseModalFor}
          coursePool={coursePool}
          grantedSlugs={memberCoursesSets.get(courseModalFor.user_id) ?? new Set<string>()}
          onClose={() => setCourseModalFor(null)}
          onToggle={(slug, checked) => handleToggleCourse(courseModalFor, slug, checked)}
        />
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove member?"
        message={pendingRemove ? `${pendingRemove.full_name || pendingRemove.email} will lose access to all their granted courses for this cohort. This can be undone with Re-add, but course access will need to be re-granted.` : ''}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}

export default function ManageCohortUsersPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Manage Cohort Users" description="Invite cohort members and control their course access.">
      <RequireNavAccess itemKey="manage-cohort-users">
        <ManageCohortUsersContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
