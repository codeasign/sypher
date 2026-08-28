'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createGroup,
  deleteGroup,
  getGroupCourses,
  getGroupNav,
  listGroups,
  renameGroup,
  setGroupCourse,
  setGroupNav,
  type CompanyAdminGroup,
  type GroupCourseCeilingItem,
  type GroupNavCeilingItem,
} from '@/data/companyAdmin';
import { NAV_ITEMS } from '@/lib/navItems';
import styles from '../admin.module.css';

const NAV_LABEL = new Map(NAV_ITEMS.map((n) => [n.key, n.label]));

export default function CorporateAdminGroupsPage(): React.JSX.Element {
  const [groups, setGroups] = useState<CompanyAdminGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const g = await listGroups();
      setGroups(g);
      setSelectedId((cur) => cur ?? g[0]?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(): Promise<void> {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const g = await createGroup(name);
      setNewName('');
      await refresh();
      setSelectedId(g.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  return (
    <>
      <h1 className={styles.h1}>Groups</h1>
      <p className={styles.hint}>
        A group is a set of employees who get the same course and sidebar access. Employees can be in
        several groups and get the combined access.
      </p>

      <div className={styles.row}>
        <input
          className={styles.input}
          placeholder="New group name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
        />
        <button className={styles.btn} onClick={() => void handleCreate()} disabled={!newName.trim()}>
          Create group
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {groups.length === 0 ? (
        <p className={styles.hint}>No groups yet.</p>
      ) : (
        <div className={styles.split}>
          <div className={styles.groupList}>
            {groups.map((g) => (
              <button
                key={g.id}
                className={g.id === selectedId ? `${styles.groupItem} ${styles.groupItemActive}` : styles.groupItem}
                onClick={() => setSelectedId(g.id)}
              >
                {g.name}
                <div className={styles.groupMeta}>
                  {g.memberCount} member{g.memberCount === 1 ? '' : 's'} · {g.courseCount} course
                  {g.courseCount === 1 ? '' : 's'} · {g.navCount} sidebar
                </div>
              </button>
            ))}
          </div>

          {selected && <GroupDetail key={selected.id} group={selected} onChanged={refresh} />}
        </div>
      )}
    </>
  );
}

function GroupDetail({ group, onChanged }: { group: CompanyAdminGroup; onChanged: () => Promise<void> }): React.JSX.Element {
  const [name, setName] = useState(group.name);
  const [courses, setCourses] = useState<GroupCourseCeilingItem[]>([]);
  const [nav, setNav] = useState<GroupNavCeilingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, n] = await Promise.all([getGroupCourses(group.id), getGroupNav(group.id)]);
      setCourses(c.ceiling);
      setNav(n.ceiling);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [group.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleCourse(courseId: string, allowed: boolean): Promise<void> {
    setCourses((cs) => cs.map((c) => (c.id === courseId ? { ...c, granted: allowed } : c)));
    try {
      await setGroupCourse(group.id, courseId, allowed);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
      void load();
    }
  }

  async function toggleNav(itemKey: string, allowed: boolean): Promise<void> {
    setNav((ns) => ns.map((n) => (n.itemKey === itemKey ? { ...n, granted: allowed } : n)));
    try {
      await setGroupNav(group.id, itemKey, allowed);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
      void load();
    }
  }

  async function handleRename(): Promise<void> {
    if (name.trim() === group.name || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await renameGroup(group.id, name.trim());
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete group "${group.name}"? Members stay, but lose this group's access.`)) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={styles.row}>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        <button className={styles.btnGhost + ' ' + styles.btn} onClick={() => void handleRename()} disabled={busy}>
          Rename
        </button>
        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => void handleDelete()} disabled={busy}>
          Delete
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.sectionTitle}>Course access</div>
      <p className={styles.hint}>Only courses in your company plan are shown.</p>
      {courses.length === 0 ? (
        <p className={styles.hint}>No courses in your plan yet — contact Sypher.</p>
      ) : (
        <div className={styles.checkList}>
          {courses.map((c) => (
            <label key={c.id} className={styles.checkRow}>
              <input type="checkbox" checked={c.granted} onChange={(e) => void toggleCourse(c.id, e.target.checked)} />
              {c.name}
            </label>
          ))}
        </div>
      )}

      <div className={styles.sectionTitle}>Sidebar access</div>
      <p className={styles.hint}>Only sidebar items in your company plan are shown.</p>
      {nav.length === 0 ? (
        <p className={styles.hint}>No sidebar items in your plan.</p>
      ) : (
        <div className={styles.checkList}>
          {nav.map((n) => (
            <label key={n.itemKey} className={styles.checkRow}>
              <input type="checkbox" checked={n.granted} onChange={(e) => void toggleNav(n.itemKey, e.target.checked)} />
              {NAV_LABEL.get(n.itemKey) ?? n.itemKey}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
