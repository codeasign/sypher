'use client';

import React, { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RestoreIcon } from '@/components/icons/ActionIcons';
import { roleLabel } from '@/lib/roleLabels';
import { listTestAccounts, resetTestAccount, setTestAccountRole, type TestAccountRow } from '@/data/testAccounts';
import styles from './test-accounts.module.css';

// Every Role enum value (apps/api/prisma/schema.prisma) — wider than the
// admin User Role tab's assignable set, since this is dev test tooling: a
// COMPANY_HR/COHORT_USER/etc. row here just won't have its company/cohort
// context, which is fine to hit while testing.
const ROLE_EDIT_OPTIONS = [
  'ADMIN',
  'FREE_USER',
  'PAID_USER',
  'MOBILE_USER',
  'INTERNAL_HR',
  'COMPANY_HR',
  'COMPANY_EMPLOYEE',
  'BRANDER',
  'COHORT_USER',
  'REVIEWER',
  'COURSE_AUDITOR',
];

export default function TestAccountsContent(): React.JSX.Element {
  const [rows, setRows] = useState<TestAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [changingRoleEmail, setChangingRoleEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('FREE_USER');
  const [adding, setAdding] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setRows(await listTestAccounts());
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleReset(email: string): Promise<void> {
    setResettingEmail(email);
    setError(null);
    const { error: resetError } = await resetTestAccount(email);
    setResettingEmail(null);
    setPendingEmail(null);
    if (resetError) {
      setError(resetError);
      return;
    }
    await load();
  }

  // Reuses the same reset endpoint everything else uses — an email that
  // isn't already on the roster gets registered as a new role-editable
  // custom account instead of 400ing, so there's no separate "create"
  // endpoint here.
  async function handleAddEmail(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const email = newEmail.trim();
    if (!email || adding) return;
    setAdding(true);
    setError(null);
    const { error: addError } = await resetTestAccount(email, newRole);
    setAdding(false);
    if (addError) {
      setError(addError);
      return;
    }
    setNewEmail('');
    await load();
  }

  async function handleRoleChange(email: string, role: string): Promise<void> {
    setChangingRoleEmail(email);
    setError(null);
    const { error: roleError } = await setTestAccountRole(email, role);
    setChangingRoleEmail(null);
    if (roleError) {
      setError(roleError);
      return;
    }
    await load();
  }

  function renderRow(row: TestAccountRow): React.JSX.Element {
    return (
      <tr key={row.email}>
        <td>{row.email}</td>
        <td>
          {row.roleEditable && row.exists ? (
            <select
              className={styles.roleSelect}
              value={row.role}
              disabled={changingRoleEmail === row.email}
              onChange={(event) => void handleRoleChange(row.email, event.target.value)}
            >
              {ROLE_EDIT_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          ) : (
            roleLabel(row.role)
          )}
        </td>
        <td>{row.companyName ?? '—'}</td>
        <td>
          {!row.exists ? (
            <span className={styles.statusMissing}>Not created</span>
          ) : row.onboarded ? (
            <span className={styles.statusOnboarded}>Onboarded</span>
          ) : (
            <span className={styles.statusPending}>Awaiting onboarding</span>
          )}
        </td>
        <td className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtnSuccess}
            disabled={resettingEmail === row.email}
            onClick={() => setPendingEmail(row.email)}
            aria-label={`Reset ${row.email}`}
            title="Delete and re-create this account"
          >
            <RestoreIcon className={styles.actionIcon} />
          </button>
        </td>
      </tr>
    );
  }

  const roleFixedRows = rows.filter((row) => !row.roleEditable);
  const roleEditableRows = rows.filter((row) => row.roleEditable);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Test Accounts</h1>
      <p className={styles.subheading}>
        Dev-only roster from <code>Test-Accounts.md</code>. Password for every account: <code>password</code>.
        Reset hard-deletes the account and re-provisions it fresh (passwordless, onboarding cleared) — fires the
        same welcome + set-password email a real provisioned account gets, so you can re-test onboarding and
        email templates.
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <p className={styles.loadingState}>Loading…</p>
      ) : (
        <div className={styles.columns}>
          <div className={styles.column}>
            <h2 className={styles.sectionHeading}>Role Roster</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{roleFixedRows.map(renderRow)}</tbody>
            </table>
          </div>

          <div className={`${styles.column} ${styles.columnDivider}`}>
            <h2 className={styles.sectionHeading}>Role-Switchable Accounts</h2>
            <p className={styles.subheading}>
              Real inboxes used to verify onboarding and email templates actually land — role changes in place
              below, no delete/recreate (which would re-send a fresh welcome email each time).
            </p>

            {roleEditableRows.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{roleEditableRows.map(renderRow)}</tbody>
              </table>
            )}

            <form className={styles.addEmailForm} onSubmit={(event) => void handleAddEmail(event)}>
              <input
                type="email"
                required
                placeholder="new-email@example.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className={styles.addEmailInput}
                disabled={adding}
              />
              <select
                className={styles.roleSelect}
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
                disabled={adding}
              >
                {ROLE_EDIT_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.addEmailBtn} disabled={adding || !newEmail.trim()}>
                {adding ? 'Adding…' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingEmail !== null}
        title="Reset test account"
        message={
          pendingEmail
            ? `This permanently deletes ${pendingEmail} and everything tied to it (sessions, progress, bookmarks, comments), then re-creates it fresh. This cannot be undone.`
            : undefined
        }
        confirmLabel={resettingEmail ? 'Resetting…' : 'Delete & Recreate'}
        cancelLabel="Cancel"
        onConfirm={() => pendingEmail && void handleReset(pendingEmail)}
        onCancel={() => setPendingEmail(null)}
      />
    </div>
  );
}
