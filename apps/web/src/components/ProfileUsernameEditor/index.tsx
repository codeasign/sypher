'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './styles.module.css';

interface MeUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
}

/** Inline editable username handle on the profile page (spec §11). Format
 * [a-z0-9_]{3,20}, uniqueness enforced by the DB unique index with a clean
 * 409 on collision. */
export default function ProfileUsernameEditor({ initial }: { initial: MeUser }): React.JSX.Element {
  const [me, setMe] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me.username);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-clear the success note after 3s — as an effect so the timer is
  // cancelled on unmount / re-save (a bare setTimeout in save() leaks and
  // fires setState on an unmounted component).
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  async function save(): Promise<void> {
    setPending(true);
    setError(null);
    setSuccess(null);
    const trimmed = draft.trim().toLowerCase();
    const res = await apiFetch('/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? `Save failed (${res.status})`);
    } else {
      const updated: MeUser = await res.json();
      setMe(updated);
      setEditing(false);
      setSuccess('Username updated');
    }
  }

  return (
    <section className={styles.handleSection} aria-label="Username handle">
      <span className={styles.handleLabel}>Username</span>
      <span className={styles.handleValue}>@{me.username}</span>

      {editing && (
        <>
          <input
            type="text"
            className={styles.handleInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. andrew_smith"
            maxLength={20}
            aria-label="New username"
          />
          <button type="button" className={styles.saveButton} onClick={() => void save()} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className={styles.cancelButton} onClick={() => { setEditing(false); setDraft(me.username); setError(null); }} disabled={pending}>
            Cancel
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </>
      )}

      {!editing && (
        <button type="button" className={styles.editButton} onClick={() => setEditing(true)}>
          Edit
        </button>
      )}
      {success && <p className={styles.success}>{success}</p>}
      <p className={styles.hint}>Lowercase letters, numbers, and underscores — 3 to 20 characters.</p>
    </section>
  );
}
