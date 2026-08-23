'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { InfoIcon } from '@/components/icons/ActionIcons';
import { NAV_ITEMS } from '@/lib/navItems';
import { roleLabel } from '@/lib/roleLabels';
import { roleColor } from '@/lib/roleColors';
import courseCatalog from '@sypher/course-catalog/src/courses';
import styles from './styles.module.css';

const ROLES = ['ADMIN', 'FREE_USER', 'PAID_USER', 'INTERNAL_HR', 'COMPANY_HR', 'COMPANY_EMPLOYEE', 'BRANDER', 'COHORT_USER'] as const;
type Role = (typeof ROLES)[number];
const NON_ADMIN_ROLES = ROLES.filter((r) => r !== 'ADMIN');

interface AccessItem {
  key: string;
  label: string;
  sublabel?: string;
}

const COURSE_ITEMS: AccessItem[] = courseCatalog.map((c) => ({ key: c.slug, label: c.title, sublabel: c.tag }));
const NAV_ITEMS_LIST: AccessItem[] = NAV_ITEMS.map((n) => ({ key: n.key, label: n.label, sublabel: n.href }));

interface Company {
  id: string;
  name: string;
}

interface Props {
  role: string;
  companyId: string | null;
}

/**
 * Read-only summary below the role cards — the cards are the "assign per
 * role" interaction, this is the "show me everything at once" view. Admin
 * is prepended to every row since it always has access via the bypass and
 * is never actually stored in allowedByKey's role arrays — omitting it
 * here would make the table look like admin has no access.
 */
function AtAGlance({ items, allowedByKey }: { items: AccessItem[]; allowedByKey: Record<string, string[]> }): React.JSX.Element {
  // Grouped by role (not by item) to match the role-card grid above it —
  // ADMIN always lists every item since it bypasses allowedByKey entirely.
  const rows = ROLES.map((r) => ({
    role: r,
    itemLabels: r === 'ADMIN' ? items.map((i) => i.label) : items.filter((item) => (allowedByKey[item.key] ?? []).includes(r)).map((i) => i.label),
  }));

  return (
    <div className={styles.glanceSection}>
      <h4>At a glance</h4>
      <table className={styles.glanceTable}>
        <thead>
          <tr>
            <th>Role</th>
            <th>Items accessible</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ role, itemLabels }) => (
            <tr key={role}>
              <td className={styles.glanceRoleCell}>
                <span className={styles.glanceRoleDot} style={{ background: roleColor(role) }} />
                {roleLabel(role)}
              </td>
              <td>
                {itemLabels.length > 0 ? (
                  <div className={styles.tagList}>
                    {itemLabels.map((label) => (
                      <span key={label} className={styles.tag}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.emptyGlance}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Ported design from apps/app/src/app/manage-access/page.tsx — role cards
 * (one per role, live "N of M accessible" count) + a modal listing every
 * item as a checkbox, each toggle saving immediately (optimistic update +
 * rollback on failure), no separate batch Save button. Both
 * CourseRoleAccessSection and NavRoleAccessSection below share this same
 * modal shape, just pointed at different item lists/endpoints.
 */
function RoleAccessModal({
  role,
  title,
  items,
  allowedByKey,
  rowErrors,
  onToggle,
  onClose,
}: {
  role: Role;
  title: string;
  items: AccessItem[];
  allowedByKey: Record<string, string[]>;
  rowErrors: Record<string, string>;
  onToggle: (itemKey: string, role: Role, checked: boolean) => void;
  onClose: () => void;
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
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-access-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="role-access-modal-title" className={styles.modalTitle}>
            {roleLabel(role)} — {title}
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {items.map((item) => {
            const allowed = allowedByKey[item.key] ?? [];
            return (
              <div key={item.key} className={styles.modalItemRow}>
                <div className={styles.itemLabelCell}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.sublabel && <span className={styles.itemHref}>{item.sublabel}</span>}
                  {rowErrors[item.key] && <p className={styles.rowError}>{rowErrors[item.key]}</p>}
                </div>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allowed.includes(role)}
                  onChange={(e) => onToggle(item.key, role, e.target.checked)}
                  aria-label={`Toggle ${roleLabel(role)} access to ${item.label}`}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalDoneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseRoleAccessSection(): React.JSX.Element {
  const [allowedByKey, setAllowedByKey] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/access/courses');
    const rows: { courseSlug: string; allowedRoles: string[] }[] = res.ok ? await res.json() : [];
    const map: Record<string, string[]> = {};
    for (const row of rows) map[row.courseSlug] = row.allowedRoles;
    setAllowedByKey(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(slug: string, role: Role, checked: boolean): Promise<void> {
    const prevRoles = allowedByKey[slug] ?? [];
    const nextRoles = checked ? [...prevRoles, role] : prevRoles.filter((r) => r !== role);
    setAllowedByKey((prev) => ({ ...prev, [slug]: nextRoles }));
    setRowErrors((p) => ({ ...p, [slug]: '' }));

    const res = await apiFetch(`/access/courses/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowedRoles: nextRoles }),
    });
    if (!res.ok) {
      setAllowedByKey((prev) => ({ ...prev, [slug]: prevRoles }));
      setRowErrors((p) => ({ ...p, [slug]: 'Failed to save.' }));
    }
  }

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading courses…</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.roleGrid}>
        <div
          className={`${styles.roleCard} ${styles.roleCardStatic}`}
          style={{ '--role-color': roleColor('ADMIN') } as React.CSSProperties}
        >
          <span className={styles.roleCardLabel}>{roleLabel('ADMIN')}</span>
          <span className={styles.roleCardCount}>
            {COURSE_ITEMS.length} of {COURSE_ITEMS.length} courses accessible — always full access
          </span>
        </div>
        {NON_ADMIN_ROLES.map((r) => {
          const count = COURSE_ITEMS.filter((item) => (allowedByKey[item.key] ?? []).includes(r)).length;
          return (
            <button key={r} type="button" className={styles.roleCard} style={{ '--role-color': roleColor(r) } as React.CSSProperties} onClick={() => setSelectedRole(r)}>
              <span className={styles.roleCardLabel}>{roleLabel(r)}</span>
              <span className={styles.roleCardCount}>
                {count} of {COURSE_ITEMS.length} courses accessible
              </span>
            </button>
          );
        })}
      </div>

      {selectedRole && (
        <RoleAccessModal
          role={selectedRole}
          title="Course Access"
          items={COURSE_ITEMS}
          allowedByKey={allowedByKey}
          rowErrors={rowErrors}
          onToggle={handleToggle}
          onClose={() => setSelectedRole(null)}
        />
      )}

      <AtAGlance items={COURSE_ITEMS} allowedByKey={allowedByKey} />
    </section>
  );
}

function NavRoleAccessSection(): React.JSX.Element {
  const [allowedByKey, setAllowedByKey] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/access/nav');
    const rows: { itemKey: string; allowedRoles: string[] }[] = res.ok ? await res.json() : [];
    const map: Record<string, string[]> = {};
    for (const row of rows) map[row.itemKey] = row.allowedRoles;
    setAllowedByKey(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(itemKey: string, role: Role, checked: boolean): Promise<void> {
    const prevRoles = allowedByKey[itemKey] ?? [];
    const nextRoles = checked ? [...prevRoles, role] : prevRoles.filter((r) => r !== role);
    setAllowedByKey((prev) => ({ ...prev, [itemKey]: nextRoles }));
    setRowErrors((p) => ({ ...p, [itemKey]: '' }));

    const res = await apiFetch(`/access/nav/${encodeURIComponent(itemKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowedRoles: nextRoles }),
    });
    if (!res.ok) {
      setAllowedByKey((prev) => ({ ...prev, [itemKey]: prevRoles }));
      setRowErrors((p) => ({ ...p, [itemKey]: 'Failed to save.' }));
    }
  }

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading sidebar access…</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.roleGrid}>
        <div
          className={`${styles.roleCard} ${styles.roleCardStatic}`}
          style={{ '--role-color': roleColor('ADMIN') } as React.CSSProperties}
        >
          <span className={styles.roleCardLabel}>{roleLabel('ADMIN')}</span>
          <span className={styles.roleCardCount}>
            {NAV_ITEMS_LIST.length} of {NAV_ITEMS_LIST.length} items visible — always full access
          </span>
        </div>
        {NON_ADMIN_ROLES.map((r) => {
          const count = NAV_ITEMS_LIST.filter((item) => (allowedByKey[item.key] ?? []).includes(r)).length;
          return (
            <button key={r} type="button" className={styles.roleCard} style={{ '--role-color': roleColor(r) } as React.CSSProperties} onClick={() => setSelectedRole(r)}>
              <span className={styles.roleCardLabel}>{roleLabel(r)}</span>
              <span className={styles.roleCardCount}>
                {count} of {NAV_ITEMS_LIST.length} items visible
              </span>
            </button>
          );
        })}
      </div>

      {selectedRole && (
        <RoleAccessModal
          role={selectedRole}
          title="Sidebar Access"
          items={NAV_ITEMS_LIST}
          allowedByKey={allowedByKey}
          rowErrors={rowErrors}
          onToggle={handleToggle}
          onClose={() => setSelectedRole(null)}
        />
      )}

      <AtAGlance items={NAV_ITEMS_LIST} allowedByKey={allowedByKey} />
    </section>
  );
}

function CompanyGrantsSection({ role, companyId }: Props): React.JSX.Element {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId ?? '');
  const [courseSlugs, setCourseSlugs] = useState<string[]>([]);
  const [navKeys, setNavKeys] = useState<string[]>([]);
  const [newSlug, setNewSlug] = useState('');
  const [newNavKey, setNewNavKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'ADMIN') {
      apiFetch('/access/companies')
        .then((res) => (res.ok ? res.json() : []))
        .then(setCompanies);
    }
  }, [role]);

  async function loadGrants(id: string): Promise<void> {
    if (!id) return;
    const [coursesRes, navRes] = await Promise.all([
      apiFetch(`/access/companies/${id}/courses`),
      apiFetch(`/access/companies/${id}/nav`),
    ]);
    setCourseSlugs(coursesRes.ok ? await coursesRes.json() : []);
    setNavKeys(navRes.ok ? await navRes.json() : []);
  }

  useEffect(() => {
    if (selectedCompanyId) loadGrants(selectedCompanyId);
  }, [selectedCompanyId]);

  async function toggleCourse(slug: string, allowed: boolean): Promise<void> {
    const res = await apiFetch(`/access/companies/${selectedCompanyId}/courses/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowed }),
    });
    setStatus(res.ok ? 'Saved.' : 'Failed to save.');
    if (res.ok) loadGrants(selectedCompanyId);
  }

  async function toggleNav(itemKey: string, allowed: boolean): Promise<void> {
    const res = await apiFetch(`/access/companies/${selectedCompanyId}/nav/${encodeURIComponent(itemKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowed }),
    });
    setStatus(res.ok ? 'Saved.' : 'Failed to save.');
    if (res.ok) loadGrants(selectedCompanyId);
  }

  return (
    <section className={styles.section}>
      <h3>Company grants (for that company&apos;s Company Employees)</h3>
      {role === 'ADMIN' && (
        <div className={styles.field}>
          <label htmlFor="company-select">Company</label>
          <select
            id="company-select"
            className={styles.select}
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedCompanyId && (
        <>
          <h4>Granted courses</h4>
          <ul className={styles.rowList}>
            {courseSlugs.map((slug) => (
              <li key={slug} className={styles.grantRow}>
                {slug}
                <button type="button" className={styles.btnSecondary} onClick={() => toggleCourse(slug, false)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.grantForm}>
            <input className={styles.input} value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="course-slug" />
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                toggleCourse(newSlug.trim(), true);
                setNewSlug('');
              }}
            >
              Grant course
            </button>
          </div>

          <h4>Granted nav items</h4>
          <ul className={styles.rowList}>
            {navKeys.map((key) => (
              <li key={key} className={styles.grantRow}>
                {key}
                <button type="button" className={styles.btnSecondary} onClick={() => toggleNav(key, false)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.grantForm}>
            <input className={styles.input} value={newNavKey} onChange={(e) => setNewNavKey(e.target.value)} placeholder="nav-item-key" />
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                toggleNav(newNavKey.trim(), true);
                setNewNavKey('');
              }}
            >
              Grant nav item
            </button>
          </div>
        </>
      )}
      {status && (
        <p role="status" className={styles.status}>
          {status}
        </p>
      )}
    </section>
  );
}

type TabKey = 'courses' | 'nav' | 'company';

interface TabDef {
  key: TabKey;
  label: string;
  tooltip: string;
}

const ADMIN_TABS: TabDef[] = [
  { key: 'courses', label: 'Course Access', tooltip: 'Admin always has access to every course.' },
  { key: 'nav', label: 'Sidebar Access', tooltip: 'Admin always has access to every sidebar item.' },
  { key: 'company', label: 'Company Grants', tooltip: "Grant a company's employees access to specific courses and sidebar items." },
];

export default function AccessManager({ role, companyId }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('courses');

  // Company HR only ever has the one section to look at (they can't touch
  // the global role-based tables) — a tab bar with a single tab is worse
  // UX than just showing the content directly, so skip tabs entirely for
  // that case rather than rendering a pointless one-item tablist.
  if (role !== 'ADMIN') {
    return <CompanyGrantsSection role={role} companyId={companyId} />;
  }

  return (
    <div>
      <div className={styles.tabBar} role="tablist" aria-label="Access management sections">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className={styles.infoIcon} tabIndex={0}>
              <InfoIcon />
              <span className={styles.tooltip} role="tooltip">
                {tab.tooltip}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.tabPanel} role="tabpanel">
        {activeTab === 'courses' && <CourseRoleAccessSection />}
        {activeTab === 'nav' && <NavRoleAccessSection />}
        {activeTab === 'company' && <CompanyGrantsSection role={role} companyId={companyId} />}
      </div>
    </div>
  );
}
