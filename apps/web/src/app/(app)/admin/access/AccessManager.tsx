'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EditIcon, ImageIcon, InfoIcon, SettingsIcon, UploadIcon } from '@/components/icons/ActionIcons';
import Pagination from '@/components/Pagination';
import { uploadToBunny } from '@/data/bunnyUpload';
import { NAV_ITEMS } from '@/lib/navItems';
import { roleLabel } from '@/lib/roleLabels';
import { roleColor } from '@/lib/roleColors';
import courseCatalog from '@sypher/course-catalog/src/courses';
import styles from './styles.module.css';

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

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
  companyId: string;
  name: string;
  logoUrl: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  adminEmail: string | null;
  address: string | null;
  city: string | null;
  stateProvince: string | null;
  countyDistrict: string | null;
  country: string | null;
  seats: number | null;
  totalYearlyCost: number | null;
  accessUntil: string; // ISO datetime
}

// Mirrors the API's business-code format (3-12 uppercase letters/digits,
// starting with a letter) so bad IDs are caught before the round trip.
const COMPANY_ID_PATTERN = /^[A-Z][A-Z0-9]{2,11}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface CompanyFormValues {
  companyId: string;
  name: string;
  logoUrl: string;
  primaryEmail: string;
  secondaryEmail: string;
  adminEmail: string;
  address: string;
  city: string;
  stateProvince: string;
  countyDistrict: string;
  country: string;
  seats: string;
  totalYearlyCost: string;
  accessUntil: string;
}

const EMPTY_COMPANY_FORM: CompanyFormValues = {
  companyId: '',
  name: '',
  logoUrl: '',
  primaryEmail: '',
  secondaryEmail: '',
  adminEmail: '',
  address: '',
  city: '',
  stateProvince: '',
  countyDistrict: '',
  country: '',
  seats: '',
  totalYearlyCost: '',
  accessUntil: '',
};

function toCompanyForm(company: Company): CompanyFormValues {
  return {
    companyId: company.companyId,
    name: company.name,
    logoUrl: company.logoUrl ?? '',
    primaryEmail: company.primaryEmail ?? '',
    secondaryEmail: company.secondaryEmail ?? '',
    adminEmail: company.adminEmail ?? '',
    address: company.address ?? '',
    city: company.city ?? '',
    stateProvince: company.stateProvince ?? '',
    countyDistrict: company.countyDistrict ?? '',
    country: company.country ?? '',
    seats: company.seats == null ? '' : String(company.seats),
    totalYearlyCost: company.totalYearlyCost == null ? '' : String(company.totalYearlyCost),
    accessUntil: company.accessUntil ? company.accessUntil.slice(0, 10) : '',
  };
}

interface Props {
  role: string;
  userId: string;
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

/** Logo image with a colored-initial fallback avatar. */
function CompanyLogo({ company }: { company: Pick<Company, 'name' | 'logoUrl'> }): React.JSX.Element {
  if (company.logoUrl) {
    return <img className={styles.companyLogo} src={company.logoUrl} alt="" aria-hidden="true" />;
  }
  return <span className={styles.companyAvatar}>{company.name.charAt(0).toUpperCase()}</span>;
}

function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Add/Edit company popup — the full 12-field profile in a two-column
 * grid. `initial` null means create. Validation mirrors the API so bad
 * input never round-trips; server errors (409 duplicates) surface inline.
 */
function CompanyFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Company | null;
  onClose: () => void;
  onSave: (values: CompanyFormValues) => Promise<string | null>;
}): React.JSX.Element {
  const [values, setValues] = useState<CompanyFormValues>(() => (initial ? toCompanyForm(initial) : EMPTY_COMPANY_FORM));
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  useEscapeClose(onClose);

  function set<K extends keyof CompanyFormValues>(key: K, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    try {
      // Uploaded to Bunny (no external-logo linking) — the form carries the
      // resulting CDN URL like every other image in the app.
      const url = await uploadToBunny(file, 'companies/logos', BUNNY_CONFIG);
      set('logoUrl', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  function validate(): string | null {
    const required = [
      ['companyId', 'Company ID'],
      ['name', 'Company name'],
      ['logoUrl', 'Company logo'],
      ['primaryEmail', 'Primary email'],
      ['secondaryEmail', 'Secondary email'],
      ['adminEmail', 'Admin email'],
      ['address', 'Address'],
      ['city', 'City'],
      ['stateProvince', 'State / Province'],
      ['countyDistrict', 'County / District'],
      ['country', 'Country'],
      ['seats', 'No. of seats'],
      ['totalYearlyCost', 'Total yearly cost'],
      ['accessUntil', 'Access till'],
    ] as const;
    for (const [field, label] of required) {
      if (!values[field].trim()) return `${label} is required`;
    }
    if (!COMPANY_ID_PATTERN.test(values.companyId.trim().toUpperCase())) {
      return 'Company ID must be 3-12 uppercase letters/digits and start with a letter';
    }
    for (const [field, label] of [
      ['primaryEmail', 'Primary email'],
      ['secondaryEmail', 'Secondary email'],
      ['adminEmail', 'Admin email'],
    ] as const) {
      if (!EMAIL_PATTERN.test(values[field].trim())) return `${label} is invalid`;
    }
    for (const [field, label] of [
      ['seats', 'No. of seats'],
      ['totalYearlyCost', 'Total yearly cost'],
    ] as const) {
      if (!/^\d+$/.test(values[field].trim())) return `${label} must be a non-negative whole number`;
    }
    if (new Date(values.accessUntil).getTime() <= Date.now()) return 'Access till must be a future date';
    return null;
  }

  async function handleSubmit(): Promise<void> {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    const saveError = await onSave(values);
    setSaving(false);
    if (saveError) setError(saveError);
    else onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modalPanel} ${styles.modalPanelWide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-form-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="company-form-modal-title" className={styles.modalTitle}>
              {initial ? 'Edit company' : 'Add company'}
            </h2>
            {initial && <p className={styles.modalSubtitle}>{initial.name}</p>}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formInner}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="company-form-id">Company ID <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-id"
                  className={styles.input}
                  value={values.companyId}
                  onChange={(e) => set('companyId', e.target.value.toUpperCase())}
                  placeholder="e.g. ACME"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-name">Company name <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input id="company-form-name" className={styles.input} value={values.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className={`${styles.field} ${styles.formFieldFull}`}>
                <label htmlFor="company-form-logo">Company logo <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <div className={styles.logoUploadRow}>
                  {values.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- CDN URL from Bunny upload, not a local asset
                    <img className={styles.logoPreview} src={values.logoUrl} alt="Company logo preview" />
                  ) : (
                    <span className={`${styles.logoPreview} ${styles.logoPreviewEmpty}`} aria-hidden="true">
                      <ImageIcon />
                    </span>
                  )}
                  {values.logoUrl && !logoUploading && <span className={styles.logoDone}>Uploaded ✓</span>}
                  <input
                    ref={logoInputRef}
                    id="company-form-logo"
                    type="file"
                    accept="image/*"
                    className={styles.logoFileInput}
                    onChange={handleLogoChange}
                  />
                  <button
                    type="button"
                    className={`${styles.btnNeutralSolid} ${styles.logoUploadAction}`}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    <UploadIcon />
                    {logoUploading ? 'Uploading…' : values.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-primary-email">Primary email <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-primary-email"
                  type="email"
                  className={styles.input}
                  value={values.primaryEmail}
                  onChange={(e) => set('primaryEmail', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-secondary-email">Secondary email <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-secondary-email"
                  type="email"
                  className={styles.input}
                  value={values.secondaryEmail}
                  onChange={(e) => set('secondaryEmail', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-admin-email">Admin email <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-admin-email"
                  type="email"
                  className={styles.input}
                  value={values.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-access">Access till <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-access"
                  type="date"
                  className={styles.input}
                  value={values.accessUntil}
                  onChange={(e) => set('accessUntil', e.target.value)}
                />
              </div>
              <div className={`${styles.field} ${styles.formFieldFull}`}>
                <label htmlFor="company-form-address">Address <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input id="company-form-address" className={styles.input} value={values.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-city">City <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input id="company-form-city" className={styles.input} value={values.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-state">State / Province <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-state"
                  className={styles.input}
                  value={values.stateProvince}
                  onChange={(e) => set('stateProvince', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-county">County / District <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-county"
                  className={styles.input}
                  value={values.countyDistrict}
                  onChange={(e) => set('countyDistrict', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-country">Country <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input id="company-form-country" className={styles.input} value={values.country} onChange={(e) => set('country', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-seats">No. of seats <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-seats"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={values.seats}
                  onChange={(e) => set('seats', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="company-form-cost">Total yearly cost (₹) <span className={styles.reqStar} aria-hidden="true">*</span></label>
                <input
                  id="company-form-cost"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={values.totalYearlyCost}
                  onChange={(e) => set('totalYearlyCost', e.target.value)}
                />
              </div>
            </div>
            {error && <p className={styles.formError}>{error}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.modalDoneBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create company'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Course + sidebar grant checkboxes for one company — each toggle saves
 * immediately (optimistic + rollback), the same interaction as the
 * role-access modals above. `companyId` is the cuid PK the grant tables
 * reference; GrantsModal only needs id + name for the title.
 */
function GrantsModal({
  company,
  onClose,
}: {
  company: Pick<Company, 'id' | 'name'>;
  onClose: () => void;
}): React.JSX.Element {
  const [courseSlugs, setCourseSlugs] = useState<string[]>([]);
  const [navKeys, setNavKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  useEscapeClose(onClose);

  useEffect(() => {
    (async () => {
      const [coursesRes, navRes] = await Promise.all([
        apiFetch(`/access/companies/${company.id}/courses`),
        apiFetch(`/access/companies/${company.id}/nav`),
      ]);
      setCourseSlugs(coursesRes.ok ? await coursesRes.json() : []);
      setNavKeys(navRes.ok ? await navRes.json() : []);
      setLoading(false);
    })();
  }, [company.id]);

  async function toggle(kind: 'courses' | 'nav', key: string, checked: boolean): Promise<void> {
    const errorKey = `${kind}:${key}`;
    const prev = kind === 'courses' ? courseSlugs : navKeys;
    const next = checked ? [...prev, key] : prev.filter((k) => k !== key);
    if (kind === 'courses') setCourseSlugs(next);
    else setNavKeys(next);
    setRowErrors((p) => ({ ...p, [errorKey]: '' }));

    const res = await apiFetch(`/access/companies/${company.id}/${kind}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowed: checked }),
    });
    if (!res.ok) {
      if (kind === 'courses') setCourseSlugs(prev);
      else setNavKeys(prev);
      setRowErrors((p) => ({ ...p, [errorKey]: 'Failed to save.' }));
    }
  }

  function renderRows(items: AccessItem[], active: string[], kind: 'courses' | 'nav', noun: string): React.JSX.Element[] {
    return items.map((item) => {
      const allowed = active.includes(item.key);
      return (
        <div key={item.key} className={styles.modalItemRow}>
          <div className={styles.itemLabelCell}>
            <span className={styles.itemLabel}>{item.label}</span>
            {item.sublabel && <span className={styles.itemHref}>{item.sublabel}</span>}
            {rowErrors[`${kind}:${item.key}`] && <p className={styles.rowError}>{rowErrors[`${kind}:${item.key}`]}</p>}
          </div>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={allowed}
            onChange={(e) => toggle(kind, item.key, e.target.checked)}
            aria-label={`Toggle ${company.name} ${noun} access to ${item.label}`}
          />
        </div>
      );
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-grants-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="company-grants-modal-title" className={styles.modalTitle}>
            Grants — {company.name}
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading grants…</p>
            </div>
          ) : (
            <>
              <h4 className={styles.grantsHeading}>Courses</h4>
              {renderRows(COURSE_ITEMS, courseSlugs, 'courses', 'employees\'')}
              <h4 className={styles.grantsHeading}>Sidebar items</h4>
              {renderRows(NAV_ITEMS_LIST, navKeys, 'nav', 'employees\'')}
            </>
          )}
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

/**
 * Admin company directory: paginated list, Add/Edit popups, and per-row
 * grant management (grey settings action). Replaces the old pick-one-
 * company + free-text-slug form with the same structure as User Role.
 */
function CompanyListSection(): React.JSX.Element {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formFor, setFormFor] = useState<Company | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [grantsFor, setGrantsFor] = useState<Pick<Company, 'id' | 'name'> | null>(null);
  const seqRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const seq = ++seqRef.current;
    setLoading(true);
    const res = await apiFetch(`/access/companies/paged?q=${encodeURIComponent(query.trim())}&page=${page}&pageSize=${USER_PAGE_SIZE}`);
    if (seq !== seqRef.current) return;
    const body = res.ok ? ((await res.json()) as { items?: Company[]; total?: number }) : {};
    setCompanies(body.items ?? []);
    setTotal(body.total ?? 0);
    setLoading(false);
  }, [query, page]);

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  async function handleSaveCompany(values: CompanyFormValues): Promise<string | null> {
    const payload = {
      companyId: values.companyId.trim().toUpperCase(),
      name: values.name.trim(),
      logoUrl: values.logoUrl.trim(),
      primaryEmail: values.primaryEmail.trim(),
      secondaryEmail: values.secondaryEmail.trim(),
      adminEmail: values.adminEmail.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      stateProvince: values.stateProvince.trim(),
      countyDistrict: values.countyDistrict.trim(),
      country: values.country.trim(),
      seats: Number(values.seats),
      totalYearlyCost: Number(values.totalYearlyCost),
      accessUntil: values.accessUntil,
    };
    const res = await apiFetch(formFor ? `/access/companies/${formFor.id}` : '/access/companies', {
      method: formFor ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let message = 'Failed to save company.';
      try {
        message = ((await res.json()) as { message?: string }).message ?? message;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      return message;
    }
    setFormOpen(false);
    await load();
    return null;
  }

  if (loading && companies.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading companies…</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.listSection}`}>
      <div className={styles.userToolbar}>
        <input
          type="search"
          aria-label="Search companies"
          className={styles.input}
          placeholder="Search by company name or ID…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => {
            setFormFor(null);
            setFormOpen(true);
          }}
        >
          Add Company
        </button>
      </div>

      {!loading && companies.length === 0 && <p className={styles.emptyGlance}>No companies match “{query}”.</p>}

      <div className={styles.userList}>
        {companies.map((company) => {
          const metaParts = [
            company.adminEmail,
            [company.city, company.country].filter(Boolean).join(', ') || null,
            company.seats != null ? `${company.seats} seat${company.seats === 1 ? '' : 's'}` : null,
            company.totalYearlyCost != null ? formatInr(company.totalYearlyCost) : null,
            company.accessUntil ? `Access till ${formatDate(company.accessUntil)}` : null,
          ].filter(Boolean) as string[];
          return (
            <div key={company.id} className={styles.userRow}>
              <CompanyLogo company={company} />
              <div className={styles.userInfo}>
                <span className={styles.userName}>{company.name}</span>
                <span className={styles.userMeta}>{metaParts.join(' · ') || '—'}</span>
              </div>
              <span className={styles.tag}>{company.companyId}</span>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnNeutral}`}
                  onClick={() => setGrantsFor({ id: company.id, name: company.name })}
                  aria-label={`Manage grants for ${company.name}`}
                >
                  <SettingsIcon />
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                  onClick={() => {
                    setFormFor(company);
                    setFormOpen(true);
                  }}
                  aria-label={`Edit ${company.name}`}
                >
                  <EditIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.pagerBar}>
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / USER_PAGE_SIZE))}
          onPageChange={(p) => setPage(p)}
          disabled={loading}
        />
      </div>

      {formOpen && <CompanyFormModal initial={formFor} onClose={() => setFormOpen(false)} onSave={handleSaveCompany} />}
      {grantsFor && <GrantsModal company={grantsFor} onClose={() => setGrantsFor(null)} />}
    </section>
  );
}

// Roles offered on the User Role tab — the set admins are meant to assign
// from this page. The API still validates against the full schema enum.
const ASSIGNABLE_ROLES: readonly Role[] = ['FREE_USER', 'PAID_USER', 'INTERNAL_HR', 'BRANDER', 'ADMIN'];

const USER_PAGE_SIZE = 10;

interface UserRow {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: Role;
}

interface NewUserForm {
  email: string;
  fullName: string;
  password: string;
  role: Role;
}

/** Escape-to-close, mirroring RoleAccessModal's keyboard affordance. */
function useEscapeClose(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

/** Popup for changing one account's role via the amber edit action button. */
function RoleChangeModal({
  user,
  onClose,
  onSave,
}: {
  user: UserRow;
  onClose: () => void;
  onSave: (user: UserRow, nextRole: Role) => Promise<string | null>;
}): React.JSX.Element {
  const [selected, setSelected] = useState<Role>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeClose(onClose);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSaving(true);
    const saveError = await onSave(user, selected);
    setSaving(false);
    if (saveError) setError(saveError);
    else onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-change-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="role-change-modal-title" className={styles.modalTitle}>
              Change role
            </h2>
            <p className={styles.modalSubtitle}>{user.email}</p>
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label>Current role</label>
            <span className={styles.tag}>{roleLabel(user.role)}</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="new-role-select">New role <span className={styles.reqStar} aria-hidden="true">*</span></label>
            <select id="new-role-select" className={styles.select} value={selected} onChange={(e) => setSelected(e.target.value as Role)}>
              {/* Accounts on a role outside the assignable set keep their
                  current value selectable until they're moved off it. */}
              {!ASSIGNABLE_ROLES.includes(user.role) && <option value={user.role}>{roleLabel(user.role)}</option>}
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          {error && <p className={styles.rowError}>{error}</p>}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.modalDoneBtn} onClick={handleSubmit} disabled={saving || selected === user.role}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Popup for provisioning a brand-new account (same rules as signup). */
function AddUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (form: NewUserForm) => Promise<string | null> }): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('FREE_USER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeClose(onClose);

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Email is invalid');
      return;
    }
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    const createError = await onCreate({ email, fullName, password, role });
    setSaving(false);
    if (createError) setError(createError);
    else onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="add-user-modal-title" className={styles.modalTitle}>
            Add user
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formInner}>
            <div className={styles.field}>
              <label htmlFor="new-user-email">Email <span className={styles.reqStar} aria-hidden="true">*</span></label>
              <input
                id="new-user-email"
                type="email"
                required
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-user-name">Full name <span className={styles.reqStar} aria-hidden="true">*</span></label>
              <input
                id="new-user-name"
                type="text"
                required
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-user-password">Password <span className={styles.reqStar} aria-hidden="true">*</span></label>
              <input
                id="new-user-password"
                type="text"
                autoComplete="off"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-user-role">Role <span className={styles.reqStar} aria-hidden="true">*</span></label>
              <select id="new-user-role" className={styles.select} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className={styles.formError}>{error}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.modalDoneBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Server-paginated list of accounts: debounced search, one row per user
 * with their role as a colored tag plus an edit action button opening the
 * role-change popup, and an "Add User" button for admin provisioning.
 * The signed in admin's own row has no action button — the API refuses
 * self-changes anyway (demoting yourself is not recoverable from here).
 */
function UserRoleSection({ userId }: Pick<Props, 'userId'>): React.JSX.Element {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleModalFor, setRoleModalFor] = useState<UserRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const seqRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const seq = ++seqRef.current;
    setLoading(true);
    const res = await apiFetch(`/access/users?q=${encodeURIComponent(query.trim())}&page=${page}&pageSize=${USER_PAGE_SIZE}`);
    if (seq !== seqRef.current) return; // a newer request superseded this one
    const body = res.ok ? ((await res.json()) as { items?: UserRow[]; total?: number }) : {};
    setUsers(body.items ?? []);
    setTotal(body.total ?? 0);
    setLoading(false);
  }, [query, page]);

  useEffect(() => {
    // Debounced so typing fires one request when keystrokes pause rather
    // than one per character (load identity also drives refetch on page
    // change and on post-create refresh).
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  function handleSearchChange(value: string): void {
    setQuery(value);
    setPage(1);
  }

  async function handleSaveRole(target: UserRow, next: Role): Promise<string | null> {
    const res = await apiFetch(`/access/users/${encodeURIComponent(target.id)}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: next }),
    });
    if (!res.ok) {
      let message = 'Failed to update role.';
      try {
        message = ((await res.json()) as { message?: string }).message ?? message;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      return message;
    }
    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, role: next } : u)));
    return null;
  }

  async function handleCreateUser(form: NewUserForm): Promise<string | null> {
    const res = await apiFetch('/access/users', { method: 'POST', body: JSON.stringify(form) });
    if (!res.ok) {
      let message = 'Failed to create user.';
      try {
        message = ((await res.json()) as { message?: string }).message ?? message;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      return message;
    }
    // Newest signups order first on the unfiltered list — land there.
    setQuery('');
    setPage(1);
    await load();
    return null;
  }

  if (loading && users.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading users…</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.listSection}`}>
      <div className={styles.userToolbar}>
        <input
          type="search"
          aria-label="Search users"
          className={styles.input}
          placeholder="Search by email, name or username…"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <button type="button" className={styles.btnPrimary} onClick={() => setAddOpen(true)}>
          Add User
        </button>
      </div>

      {!loading && users.length === 0 && <p className={styles.emptyGlance}>No users match “{query}”.</p>}

      <div className={styles.userList}>
        {users.map((user) => (
          <div key={user.id} className={styles.userRow}>
            <span className={styles.glanceRoleDot} style={{ background: roleColor(user.role) }} aria-hidden="true" />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.fullName ?? user.username}</span>
              <span className={styles.userMeta}>
                {user.email} · @{user.username}
              </span>
            </div>
            <span className={styles.tag}>{roleLabel(user.role)}</span>
            {user.id === userId ? (
              <span className={styles.tag}>You</span>
            ) : (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                onClick={() => setRoleModalFor(user)}
                aria-label={`Change role for ${user.email}`}
              >
                <EditIcon />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles.pagerBar}>
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / USER_PAGE_SIZE))}
          onPageChange={(p) => setPage(p)}
          disabled={loading}
        />
      </div>

      {roleModalFor && <RoleChangeModal user={roleModalFor} onClose={() => setRoleModalFor(null)} onSave={handleSaveRole} />}
      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onCreate={handleCreateUser} />}
    </section>
  );
}

type TabKey = 'courses' | 'nav' | 'company' | 'users';

interface TabDef {
  key: TabKey;
  label: string;
  tooltip: string;
}

const ADMIN_TABS: TabDef[] = [
  { key: 'courses', label: 'Course Access', tooltip: 'Admin always has access to every course.' },
  { key: 'nav', label: 'Sidebar Access', tooltip: 'Admin always has access to every sidebar item.' },
  { key: 'company', label: 'Company Grants', tooltip: 'Manage company profiles (ID, contacts, seats, cost) and grant their employees access to courses and sidebar items.' },
  { key: 'users', label: 'User Role', tooltip: 'Assign a user account its role — Free User, Paid User, Internal HR, Brander or Admin.' },
];

export default function AccessManager({ role, userId }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('courses');

  // The page gate (page.tsx) only lets ADMIN through, so the manager is
  // always rendered for an admin; kept as a hard stop regardless so the
  // component can't render privileged panels for a non-admin by accident.
  if (role !== 'ADMIN') {
    return (
      <section className={styles.section}>
        <p className={styles.emptyGlance}>You don&apos;t have access to this page.</p>
      </section>
    );
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
        {activeTab === 'company' && <CompanyListSection />}
        {activeTab === 'users' && <UserRoleSection userId={userId} />}
      </div>
    </div>
  );
}
