import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import RequireAdmin from '@site/src/components/RequireAdmin';
import ConfirmDialog from '@site/src/components/ConfirmDialog';
import { useAuth } from '@site/src/contexts/AuthContext';
import { listProfiles, updateProfileRole, softDeleteProfile } from '@site/src/data/profiles';
import { ROLES } from '@site/src/types/roles';
import type { Role } from '@site/src/types/roles';
import styles from './manage-users.module.css';

/* ── Types ── */

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

/* ── Helpers ── */

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function getRoleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

/* ── SVG icons ── */

function SearchIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--ifm-color-emphasis-500)' }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EditIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function AlertCircleIcon(): JSX.Element {
  return (
    <svg
      className={styles.errorIcon}
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UsersIcon(): JSX.Element {
  return (
    <svg
      className={styles.emptyIcon}
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ── Edit role modal ── */

interface EditRoleModalProps {
  open: boolean;
  profile: Profile | null;
  onSave: (role: Role) => Promise<void>;
  onCancel: () => void;
}

function EditRoleModal({ open, profile, onSave, onCancel }: EditRoleModalProps): JSX.Element | null {
  const [selectedRole, setSelectedRole] = useState<Role>('free_users');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedRole(profile.role);
    }
  }, [profile]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open || !profile) return null;

  const displayName = profile.full_name || profile.email.split('@')[0];

  async function handleSave(): Promise<void> {
    setSaving(true);
    await onSave(selectedRole);
    setSaving(false);
  }

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-role-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="edit-role-title" className={styles.modalTitle}>
          Edit role
        </h2>
        <p className={styles.modalMessage}>
          Change the role for <strong>{displayName}</strong>.
        </p>
        <select
          className={styles.roleSelect}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as Role)}
          aria-label="Role"
          disabled={saving}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Content component ── */

function ManageUsersContent(): JSX.Element {
  const { supabase } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const data = await listProfiles(supabase);
    setUsers(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(profile: Profile, nextRole: Role): Promise<void> {
    const prevRole = profile.role;
    setUsers((prev) => prev.map((u) => (u.id === profile.id ? { ...u, role: nextRole } : u)));
    setRowErrors((prev) => ({ ...prev, [profile.id]: '' }));

    const { error: updateError } = await updateProfileRole(supabase, profile.id, nextRole);
    if (updateError) {
      setUsers((prev) => prev.map((u) => (u.id === profile.id ? { ...u, role: prevRole } : u)));
      setRowErrors((prev) => ({ ...prev, [profile.id]: updateError }));
      throw new Error(updateError);
    }
  }

  async function handleSaveRole(nextRole: Role): Promise<void> {
    if (!editingProfile) return;
    try {
      await handleRoleChange(editingProfile, nextRole);
      setEditingProfile(null);
    } catch {
      // error is surfaced inline on the row via rowErrors; keep the modal open
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);

    const { error: deleteError } = await softDeleteProfile(supabase, target.id);
    if (deleteError) {
      setRowErrors((prev) => ({ ...prev, [target.id]: deleteError }));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
  }

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (user.full_name ?? '').toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    free: users.filter((u) => u.role === 'free_users').length,
    paid: users.filter((u) => u.role === 'paid_users').length,
  };

  /* ── Loading state ── */

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircleIcon />
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={fetchUsers}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.heading}>Manage Users</h1>
        <p className={styles.subtitle}>
          View and manage all registered users on the platform.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Users</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.admins}</span>
          <span className={styles.statLabel}>Admins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.free}</span>
          <span className={styles.statLabel}>Free Users</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.paid}</span>
          <span className={styles.statLabel}>Paid Users</span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <div
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <SearchIcon />
          </div>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      {filteredUsers.length === 0 ? (
        /* ── Empty state ── */
        <div className={styles.emptyState}>
          <UsersIcon />
          <h3 className={styles.emptyTitle}>No users found</h3>
          <p className={styles.emptyText}>
            {searchQuery || roleFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No users have registered yet.'}
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {filteredUsers.map((user) => {
            const displayName = user.full_name || user.email.split('@')[0];
            return (
              <div key={user.id} className={styles.tableRow}>
                <div className={styles.userCell}>
                  <span className={styles.userAvatar}>{getInitials(displayName)}</span>
                  <span className={styles.userName}>{displayName}</span>
                </div>
                <span className={styles.tableCell}>{user.email}</span>
                <div className={styles.tableCell}>
                  <span className={styles.roleLabel}>{getRoleLabel(user.role)}</span>
                  {rowErrors[user.id] && (
                    <p className={styles.rowError}>{rowErrors[user.id]}</p>
                  )}
                </div>
                <span className={styles.tableCell}>{formatJoined(user.created_at)}</span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    title="Edit role"
                    aria-label={`Edit role for ${displayName}`}
                    onClick={() => setEditingProfile(user)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    title="Delete user"
                    aria-label={`Delete ${displayName}`}
                    onClick={() => setPendingDelete(user)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete user?"
        message={
          pendingDelete
            ? `"${pendingDelete.full_name || pendingDelete.email}" will lose access to the platform. This can be undone from the database if needed.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <EditRoleModal
        open={editingProfile !== null}
        profile={editingProfile}
        onSave={handleSaveRole}
        onCancel={() => setEditingProfile(null)}
      />
    </div>
  );
}

/* ── Page component ── */

export default function ManageUsersPage(): JSX.Element {
  return (
    <DashboardLayout
      title="Manage Users"
      description="View and manage all registered users on the platform."
    >
      <RequireAdmin>
        <ManageUsersContent />
      </RequireAdmin>
    </DashboardLayout>
  );
}
