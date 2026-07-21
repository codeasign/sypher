'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RequireAdmin from '@/components/RequireAdmin';
import { useAuth } from '@/contexts/AuthContext';
import courses from '@sypher/course-catalog/src/courses';
import { fetchCourseAccessRows, setCourseRoles } from '@/data/courseAccess';
import { fetchNavAccessRows, setNavItemRoles } from '@/data/navAccess';
import { NAV_SECTIONS } from '@/data/navItems';
import {
  fetchDistinctCompanyNames,
  fetchCompanyCourseAccessRows,
  fetchCompanyNavAccessRows,
  setCompanyCourseAccess,
  setCompanyNavAccess,
} from '@/data/companyAccess';
import { ROLES, GLOBALLY_CONFIGURABLE_ROLES } from '@/types/roles';
import type { Role } from '@/types/roles';
import TaxonomyTab from '@/components/TaxonomyTab';
import LocationsTab from '@/components/LocationsTab';
import ResumeMockCreditsTab from '@/components/ResumeMockCreditsTab';
import { ManageAccessIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import styles from './manage-access.module.css';

/* ── Types ── */

interface Course {
  slug: string;
  docsSlug: string;
  icon: string;
  title: string;
  tag: string;
}

interface AccessModalItem {
  key: string;
  label: string;
  sublabel?: string;
  sectionTitle?: string;
}

/* ── SVG icons ── */

function AlertCircleIcon(): React.JSX.Element {
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

const NON_ADMIN_ROLES = GLOBALLY_CONFIGURABLE_ROLES;

/* ── Shared role access modal ── */

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
  items: AccessModalItem[];
  allowedByKey: Record<string, Role[]>;
  rowErrors: Record<string, string>;
  onToggle: (itemKey: string, role: Role, checked: boolean) => void;
  onClose: () => void;
}): React.JSX.Element {
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;
  let lastSection = '';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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
            {roleLabel} — {title}
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {items.map((item) => {
            const showSectionHeader = Boolean(item.sectionTitle) && item.sectionTitle !== lastSection;
            lastSection = item.sectionTitle ?? lastSection;
            const allowed = allowedByKey[item.key] ?? [];
            return (
              <React.Fragment key={item.key}>
                {showSectionHeader && <div className={styles.sectionHeaderRow}>{item.sectionTitle}</div>}
                <div className={styles.modalItemRow}>
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
                    aria-label={`Toggle ${roleLabel} access to ${item.label}`}
                  />
                </div>
              </React.Fragment>
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

/* ── Shared company access modal ── */

function CompanyAccessModal({
  companyName,
  title,
  items,
  allowedKeys,
  rowErrors,
  onToggle,
  onClose,
}: {
  companyName: string;
  title: string;
  items: AccessModalItem[];
  allowedKeys: Set<string>;
  rowErrors: Record<string, string>;
  onToggle: (itemKey: string, checked: boolean) => void;
  onClose: () => void;
}): React.JSX.Element {
  let lastSection = '';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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
        aria-labelledby="company-access-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="company-access-modal-title" className={styles.modalTitle}>
            {companyName} — {title}
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {items.map((item) => {
            const showSectionHeader = Boolean(item.sectionTitle) && item.sectionTitle !== lastSection;
            lastSection = item.sectionTitle ?? lastSection;
            return (
              <React.Fragment key={item.key}>
                {showSectionHeader && <div className={styles.sectionHeaderRow}>{item.sectionTitle}</div>}
                <div className={styles.modalItemRow}>
                  <div className={styles.itemLabelCell}>
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.sublabel && <span className={styles.itemHref}>{item.sublabel}</span>}
                    {rowErrors[item.key] && <p className={styles.rowError}>{rowErrors[item.key]}</p>}
                  </div>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allowedKeys.has(item.key)}
                    onChange={(e) => onToggle(item.key, e.target.checked)}
                    aria-label={`Toggle ${companyName} access to ${item.label}`}
                  />
                </div>
              </React.Fragment>
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

/* ── Courses tab ── */

const COURSE_ITEMS: AccessModalItem[] = (courses as Course[]).map((course) => ({
  key: course.docsSlug,
  label: course.title,
  sublabel: course.tag,
}));

function CoursesTab(): React.JSX.Element {
  const { supabase } = useAuth();
  const [allowedByKey, setAllowedByKey] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const accessRows = await fetchCourseAccessRows(supabase);
    const map: Record<string, Role[]> = {};
    for (const row of accessRows as { course_slug: string; allowed_roles: Role[] }[]) {
      map[row.course_slug] = row.allowed_roles ?? [];
    }
    setAllowedByKey(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function handleToggle(slug: string, role: Role, checked: boolean): Promise<void> {
    const prevRoles = allowedByKey[slug] ?? [];
    const nextRoles = checked ? [...prevRoles, role] : prevRoles.filter((r) => r !== role);
    setAllowedByKey((prev) => ({ ...prev, [slug]: nextRoles }));
    setRowErrors((p) => ({ ...p, [slug]: '' }));

    const { error: updateError } = await setCourseRoles(supabase, slug, nextRoles);
    if (updateError) {
      setAllowedByKey((prev) => ({ ...prev, [slug]: prevRoles }));
      setRowErrors((p) => ({ ...p, [slug]: updateError }));
    }
    trackEvent('manageaccess_course_toggle', { course_slug: slug, role, granted: checked });
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircleIcon />
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.retryBtn} onClick={fetchRows}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.adminNote}>Admin always has access to every course.</div>
      <div className={styles.roleGrid}>
        <div className={`${styles.roleCard} ${styles.roleCardStatic}`}>
          <span className={styles.roleCardLabel}>Admin</span>
          <span className={styles.roleCardCount}>
            {COURSE_ITEMS.length} of {COURSE_ITEMS.length} courses accessible — always full access
          </span>
        </div>
        {NON_ADMIN_ROLES.map((r) => {
          const accessibleCount = COURSE_ITEMS.filter((item) => (allowedByKey[item.key] ?? []).includes(r.value)).length;
          return (
            <button
              type="button"
              key={r.value}
              className={styles.roleCard}
              onClick={() => setSelectedRole(r.value)}
            >
              <span className={styles.roleCardLabel}>{r.label}</span>
              <span className={styles.roleCardCount}>
                {accessibleCount} of {COURSE_ITEMS.length} courses accessible
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
    </>
  );
}

/* ── Nav access tab ── */

const FLAT_NAV_ITEMS: AccessModalItem[] = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    key: item.key,
    label: item.label,
    sublabel: item.href,
    sectionTitle: section.title,
  })),
);

function NavAccessTab(): React.JSX.Element {
  const { supabase } = useAuth();
  const [allowedByKey, setAllowedByKey] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const navRows = await fetchNavAccessRows(supabase);
    const map: Record<string, Role[]> = {};
    for (const row of navRows as { item_key: string; allowed_roles: Role[] }[]) {
      map[row.item_key] = row.allowed_roles ?? [];
    }
    setAllowedByKey(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function handleToggle(itemKey: string, role: Role, checked: boolean): Promise<void> {
    const prevRoles = allowedByKey[itemKey] ?? [];
    const nextRoles = checked ? [...prevRoles, role] : prevRoles.filter((r) => r !== role);
    setAllowedByKey((prev) => ({ ...prev, [itemKey]: nextRoles }));
    setRowErrors((p) => ({ ...p, [itemKey]: '' }));

    const { error: updateError } = await setNavItemRoles(supabase, itemKey, nextRoles);
    if (updateError) {
      setAllowedByKey((prev) => ({ ...prev, [itemKey]: prevRoles }));
      setRowErrors((p) => ({ ...p, [itemKey]: updateError }));
    }
    trackEvent('manageaccess_nav_toggle', { item_key: itemKey, role, granted: checked });
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading sidebar access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircleIcon />
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.retryBtn} onClick={fetchRows}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.adminNote}>Admin always has access to every sidebar item.</div>
      <div className={styles.roleGrid}>
        <div className={`${styles.roleCard} ${styles.roleCardStatic}`}>
          <span className={styles.roleCardLabel}>Admin</span>
          <span className={styles.roleCardCount}>
            {FLAT_NAV_ITEMS.length} of {FLAT_NAV_ITEMS.length} items visible — always full access
          </span>
        </div>
        {NON_ADMIN_ROLES.map((r) => {
          const visibleCount = FLAT_NAV_ITEMS.filter((item) => (allowedByKey[item.key] ?? []).includes(r.value)).length;
          return (
            <button
              type="button"
              key={r.value}
              className={styles.roleCard}
              onClick={() => setSelectedRole(r.value)}
            >
              <span className={styles.roleCardLabel}>{r.label}</span>
              <span className={styles.roleCardCount}>
                {visibleCount} of {FLAT_NAV_ITEMS.length} items visible
              </span>
            </button>
          );
        })}
      </div>

      {selectedRole && (
        <RoleAccessModal
          role={selectedRole}
          title="Sidebar Access"
          items={FLAT_NAV_ITEMS}
          allowedByKey={allowedByKey}
          rowErrors={rowErrors}
          onToggle={handleToggle}
          onClose={() => setSelectedRole(null)}
        />
      )}
    </>
  );
}

/* ── Companies tab ── */

function CompaniesTab(): React.JSX.Element {
  const { supabase } = useAuth();
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [courseAllowedKeys, setCourseAllowedKeys] = useState<Set<string>>(new Set());
  const [navAllowedKeys, setNavAllowedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [activeModal, setActiveModal] = useState<'courses' | 'nav' | null>(null);

  useEffect(() => {
    fetchDistinctCompanyNames(supabase).then(setCompanyOptions);
  }, [supabase]);

  const fetchCompanyRows = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const [courseKeys, navKeys] = await Promise.all([
      fetchCompanyCourseAccessRows(supabase, name),
      fetchCompanyNavAccessRows(supabase, name),
    ]);
    setCourseAllowedKeys(courseKeys as Set<string>);
    setNavAllowedKeys(navKeys as Set<string>);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setCourseAllowedKeys(new Set());
      setNavAllowedKeys(new Set());
      return;
    }
    trackEvent('manageaccess_company_lookup');
    fetchCompanyRows(trimmed);
  }, [companyName, fetchCompanyRows]);

  async function handleToggleCourse(slug: string, checked: boolean): Promise<void> {
    const trimmed = companyName.trim();
    const prev = courseAllowedKeys;
    const next = new Set(prev);
    if (checked) next.add(slug); else next.delete(slug);
    setCourseAllowedKeys(next);
    setRowErrors((p) => ({ ...p, [slug]: '' }));

    const { error: updateError } = await setCompanyCourseAccess(supabase, trimmed, slug, checked);
    if (updateError) {
      setCourseAllowedKeys(prev);
      setRowErrors((p) => ({ ...p, [slug]: updateError }));
    }
    trackEvent('manageaccess_company_course_toggle', { course_slug: slug, granted: checked });
  }

  async function handleToggleNav(itemKey: string, checked: boolean): Promise<void> {
    const trimmed = companyName.trim();
    const prev = navAllowedKeys;
    const next = new Set(prev);
    if (checked) next.add(itemKey); else next.delete(itemKey);
    setNavAllowedKeys(next);
    setRowErrors((p) => ({ ...p, [itemKey]: '' }));

    const { error: updateError } = await setCompanyNavAccess(supabase, trimmed, itemKey, checked);
    if (updateError) {
      setNavAllowedKeys(prev);
      setRowErrors((p) => ({ ...p, [itemKey]: updateError }));
    }
    trackEvent('manageaccess_company_nav_toggle', { item_key: itemKey, granted: checked });
  }

  const trimmedName = companyName.trim();

  return (
    <>
      <div className={styles.adminNote}>
        Configure which courses and sidebar items Company Employees can see, per company.
      </div>

      <label className={styles.fieldLabel} htmlFor="companies-tab-name">
        Company name
      </label>
      <input
        id="companies-tab-name"
        type="text"
        className={styles.searchInput}
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Company Name"
        list="companies-tab-name-options"
      />
      <datalist id="companies-tab-name-options">
        {companyOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {!trimmedName ? null : loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading access...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <AlertCircleIcon />
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => fetchCompanyRows(trimmedName)}>
            Retry
          </button>
        </div>
      ) : (
        <div className={styles.roleGrid}>
          <button type="button" className={styles.roleCard} onClick={() => setActiveModal('courses')}>
            <span className={styles.roleCardLabel}>Courses</span>
            <span className={styles.roleCardCount}>
              {courseAllowedKeys.size} of {COURSE_ITEMS.length} courses accessible for {trimmedName}
            </span>
          </button>
          <button type="button" className={styles.roleCard} onClick={() => setActiveModal('nav')}>
            <span className={styles.roleCardLabel}>Sidebar Navigation</span>
            <span className={styles.roleCardCount}>
              {navAllowedKeys.size} of {FLAT_NAV_ITEMS.length} items visible for {trimmedName}
            </span>
          </button>
        </div>
      )}

      {activeModal === 'courses' && trimmedName && (
        <CompanyAccessModal
          companyName={trimmedName}
          title="Course Access"
          items={COURSE_ITEMS}
          allowedKeys={courseAllowedKeys}
          rowErrors={rowErrors}
          onToggle={handleToggleCourse}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'nav' && trimmedName && (
        <CompanyAccessModal
          companyName={trimmedName}
          title="Sidebar Access"
          items={FLAT_NAV_ITEMS}
          allowedKeys={navAllowedKeys}
          rowErrors={rowErrors}
          onToggle={handleToggleNav}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

/* ── Content component ── */

function ManageAccessContent(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'courses' | 'nav' | 'companies' | 'taxonomy' | 'locations' | 'resumeMock'
  >('courses');

  useEffect(() => {
    trackEvent('manageaccess_page_view');
  }, []);

  function selectTab(tab: typeof activeTab): void {
    setActiveTab(tab);
    trackEvent('manageaccess_tab_switch', { tab });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ManageAccessIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Manage Course Access</h1>
          <p className={styles.subtitle}>
            Control which courses are free vs paid, and which dashboard sections each role can see.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'courses' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('courses')}
        >
          Courses
        </button>
        <button
          type="button"
          className={activeTab === 'nav' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('nav')}
        >
          Sidebar Navigation
        </button>
        <button
          type="button"
          className={activeTab === 'companies' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('companies')}
        >
          Companies
        </button>
        <button
          type="button"
          className={activeTab === 'taxonomy' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('taxonomy')}
        >
          Roles & Skills
        </button>
        <button
          type="button"
          className={activeTab === 'locations' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('locations')}
        >
          Locations
        </button>
        <button
          type="button"
          className={activeTab === 'resumeMock' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectTab('resumeMock')}
        >
          Resume Reviews & Mock Interview
        </button>
      </div>

      {activeTab === 'courses' ? (
        <CoursesTab />
      ) : activeTab === 'nav' ? (
        <NavAccessTab />
      ) : activeTab === 'companies' ? (
        <CompaniesTab />
      ) : activeTab === 'taxonomy' ? (
        <TaxonomyTab />
      ) : activeTab === 'locations' ? (
        <LocationsTab />
      ) : (
        <ResumeMockCreditsTab />
      )}
    </div>
  );
}

/* ── Page component ── */

export default function ManageAccessPage(): React.JSX.Element {
  return (
    <DashboardLayout
      title="Manage Course Access"
      description="Control which courses are free vs paid, and which dashboard sections each role can see."
    >
      <RequireAdmin>
        <ManageAccessContent />
      </RequireAdmin>
    </DashboardLayout>
  );
}
