'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  hrListEmployees,
  hrSetEmployeeActive,
  hrListPendingInvites,
  hrInviteEmployee,
  hrRevokeInvite,
  hrListEmployeeCourseAccess,
  hrSetEmployeeCourseAccess,
} from '@/data/employeeAccess';
import { listCompanyCourseAccess } from '@/data/companyAccess';
import { UsersIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import courses from '@sypher/course-catalog/src/courses';
import styles from './manage-employees.module.css';

interface Employee {
  email: string;
  full_name: string | null;
  confirmed_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface PendingInvite {
  email: string;
  invited_at: string;
}

interface ManageEmployeesData {
  employees: Employee[];
  pendingInvites: PendingInvite[];
  coursePool: string[];
  employeeCourses: Record<string, string[]>;
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

function InviteEmployeeModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}): React.JSX.Element {
  const { supabase, companyName, user } = useAuth();
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
    if (!companyName || sending) return;
    setSending(true);
    setError(null);
    trackEvent('manageemployees_invite_submit');
    const result = await hrInviteEmployee(supabase, { companyName, email, fullName: name, invitedBy: user?.id });
    setSending(false);
    trackEvent('manageemployees_invite_result', { outcome: result.outcome });
    if (result.outcome === 'error') {
      setError(result.error ?? 'Failed to send invite');
      return;
    }
    onInvited();
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="invite-employee-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="invite-employee-title" className={styles.modalTitle}>Invite Employee</h2>
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
              placeholder="jane@company.com"
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
  employee,
  coursePool,
  grantedSlugs,
  onClose,
  onToggle,
}: {
  employee: Employee;
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
            {employee.full_name || employee.email} — Course Access
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.modalBody}>
          {coursePool.length === 0 ? (
            <p className={styles.errorText}>
              Your company doesn&apos;t have any courses licensed yet — ask an admin to grant access from Site Administration.
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

function ManageEmployeesContent(): React.JSX.Element {
  const { supabase, companyName } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [courseModalFor, setCourseModalFor] = useState<Employee | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null);
  const [courseErrorByEmail, setCourseErrorByEmail] = useState<Record<string, string>>({});

  const swrKey = supabase && companyName ? (['manageEmployees', companyName] as const) : null;

  const { data, isLoading: loading, error: swrError, mutate: refetch } = useSWR<ManageEmployeesData>(
    swrKey,
    async () => {
      const [employees, pendingInvites, poolRows, courseRows] = await Promise.all([
        hrListEmployees(supabase),
        hrListPendingInvites(supabase, companyName!),
        listCompanyCourseAccess(supabase, companyName!),
        hrListEmployeeCourseAccess(supabase, companyName!),
      ]);
      const employeeCourses: Record<string, string[]> = {};
      for (const row of courseRows) {
        (employeeCourses[row.employee_email] ??= []).push(row.course_slug);
      }
      return {
        employees,
        pendingInvites,
        coursePool: poolRows.map((r: { course_slug: string }) => r.course_slug),
        employeeCourses,
      };
    }
  );

  const error =
    actionError ??
    (!supabase ? 'Not signed in.' : !companyName ? 'Your account has no company assigned. Contact an admin.' : swrError ? 'Failed to load employees.' : null);

  useEffect(() => {
    trackEvent('manageemployees_page_view');
  }, []);

  const employeeCoursesSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [email, slugs] of Object.entries(data?.employeeCourses ?? {})) {
      map.set(email, new Set(slugs));
    }
    return map;
  }, [data?.employeeCourses]);

  async function handleToggleActive(employee: Employee, active: boolean): Promise<void> {
    trackEvent('manageemployees_set_active', { active });
    setActionError(null);
    const { error: updateError } = await hrSetEmployeeActive(supabase, employee.email, active);
    if (updateError) {
      setActionError(updateError);
      return;
    }
    refetch();
  }

  async function confirmDeactivate(): Promise<void> {
    if (!pendingDeactivate) return;
    const target = pendingDeactivate;
    setPendingDeactivate(null);
    await handleToggleActive(target, false);
  }

  async function handleRevokeInvite(email: string): Promise<void> {
    trackEvent('manageemployees_revoke_invite');
    setActionError(null);
    const { error: revokeError } = await hrRevokeInvite(supabase, email);
    if (revokeError) {
      setActionError(revokeError);
      return;
    }
    refetch();
  }

  async function handleToggleCourse(employee: Employee, slug: string, checked: boolean): Promise<void> {
    setCourseErrorByEmail((p) => ({ ...p, [employee.email]: '' }));
    const { error: toggleError } = await hrSetEmployeeCourseAccess(supabase, companyName!, employee.email, slug, checked);
    if (toggleError) {
      setCourseErrorByEmail((p) => ({ ...p, [employee.email]: toggleError }));
      return;
    }
    trackEvent('manageemployees_course_toggle', { course_slug: slug, granted: checked });
    refetch();
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading employees...</p>
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

  const employees = data?.employees ?? [];
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
            <h1 className={styles.heading}>Manage Employees</h1>
            <p className={styles.subtitle}>Invite employees and control their course access for {companyName}.</p>
          </div>
        </div>
        <button type="button" className={styles.inviteBtn} onClick={() => setInviteOpen(true)}>
          <PlusIcon />
          Invite Employee
        </button>
      </div>

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

      {employees.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No employees yet. Invite your first one.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>Employee</span>
            <span>Status</span>
            <span>Course Access</span>
            <span>Actions</span>
          </div>
          {employees.map((employee) => {
            const grantedSlugs = employeeCoursesSets.get(employee.email) ?? new Set<string>();
            const deactivated = employee.deleted_at !== null;
            return (
              <div key={employee.email} className={styles.tableRow}>
                <div className={styles.userCell}>
                  <span className={styles.userName}>{employee.full_name || employee.email}</span>
                  {employee.full_name && <span className={styles.userEmail}>{employee.email}</span>}
                </div>
                <span className={styles.tableCell}>
                  <span className={`${styles.statusBadge} ${deactivated ? styles.statusDeactivated : employee.confirmed_at ? styles.statusActive : styles.statusInvited}`}>
                    {deactivated ? 'Deactivated' : employee.confirmed_at ? 'Active' : 'Invited'}
                  </span>
                </span>
                <span className={styles.tableCell}>
                  <button
                    type="button"
                    className={styles.courseAccessBtn}
                    disabled={deactivated}
                    onClick={() => setCourseModalFor(employee)}
                  >
                    {grantedSlugs.size} of {coursePool.length} courses
                  </button>
                  {courseErrorByEmail[employee.email] && <p className={styles.rowError}>{courseErrorByEmail[employee.email]}</p>}
                </span>
                <div className={styles.actions}>
                  {deactivated ? (
                    <button type="button" className={styles.textActionBtn} onClick={() => handleToggleActive(employee, true)}>
                      Reactivate
                    </button>
                  ) : (
                    <button type="button" className={`${styles.textActionBtn} ${styles.textActionBtnDanger}`} onClick={() => setPendingDeactivate(employee)}>
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inviteOpen && (
        <InviteEmployeeModal onClose={() => setInviteOpen(false)} onInvited={() => refetch()} />
      )}

      {courseModalFor && (
        <CourseAccessModal
          employee={courseModalFor}
          coursePool={coursePool}
          grantedSlugs={employeeCoursesSets.get(courseModalFor.email) ?? new Set<string>()}
          onClose={() => setCourseModalFor(null)}
          onToggle={(slug, checked) => handleToggleCourse(courseModalFor, slug, checked)}
        />
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate employee?"
        message={pendingDeactivate ? `${pendingDeactivate.full_name || pendingDeactivate.email} will lose access to all their granted courses. This can be undone with Reactivate, but course access will need to be re-granted.` : ''}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </div>
  );
}

export default function ManageEmployeesPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Manage Employees" description="Invite employees and control their course access.">
      <RequireNavAccess itemKey="manage-employees">
        <ManageEmployeesContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
