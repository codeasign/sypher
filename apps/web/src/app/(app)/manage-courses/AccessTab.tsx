'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  getCourseAccessRoles,
  setCourseAccessRoles,
  listCourseAccessCompanies,
  setCourseAccessCompany,
} from '@/data/courses';
import { roleLabel } from '@/lib/roleLabels';
import styles from './manage-courses.module.css';

// Same exclusions as v1's GLOBALLY_CONFIGURABLE_ROLES: admin always has
// access, company_employee access comes from the company-grant section
// below (not a direct role checkbox), and cohort members don't get
// authored-course access in v1 either (cohort course pools are scoped to
// the slug-keyed docs system only) — carried over unchanged.
const CONFIGURABLE_ROLES = ['FREE_USER', 'PAID_USER', 'INTERNAL_HR', 'COMPANY_HR', 'BRANDER'];

interface Company {
  id: string;
  name: string;
}

interface AccessTabProps {
  courseId: string;
}

export default function AccessTab({ courseId }: AccessTabProps): React.JSX.Element {
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getCourseAccessRoles(courseId),
      listCourseAccessCompanies(courseId),
      apiFetch('/access/companies').then((res) => (res.ok ? res.json() : [])),
    ]).then(([roles, companies, all]) => {
      setAllowedRoles(roles);
      setCompanyIds(companies);
      setAllCompanies(all);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleToggleRole(role: string, checked: boolean): Promise<void> {
    const next = checked ? [...allowedRoles, role] : allowedRoles.filter((r) => r !== role);
    setAllowedRoles(next);
    setRowErrors((p) => ({ ...p, [role]: '' }));
    const { error } = await setCourseAccessRoles(courseId, next);
    if (error) {
      setRowErrors((p) => ({ ...p, [role]: error }));
      setAllowedRoles(allowedRoles);
    }
  }

  async function handleAddCompany(): Promise<void> {
    if (!selectedCompanyId || companyIds.includes(selectedCompanyId)) return;
    const id = selectedCompanyId;
    setSelectedCompanyId('');
    const { error } = await setCourseAccessCompany(courseId, id, true);
    if (error) {
      setRowErrors((p) => ({ ...p, [id]: error }));
      return;
    }
    setCompanyIds((prev) => [...prev, id]);
  }

  async function handleRemoveCompany(id: string): Promise<void> {
    const { error } = await setCourseAccessCompany(courseId, id, false);
    if (error) {
      setRowErrors((p) => ({ ...p, [id]: error }));
      return;
    }
    setCompanyIds((prev) => prev.filter((c) => c !== id));
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading access...</p>
      </div>
    );
  }

  const grantedCompanies = allCompanies.filter((c) => companyIds.includes(c.id));
  const availableCompanies = allCompanies.filter((c) => !companyIds.includes(c.id));

  return (
    <div>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Roles</h3>
        <p className={styles.adminNote}>Admin always has access to every course.</p>
        <div className={styles.roleGrid}>
          {CONFIGURABLE_ROLES.map((role) => (
            <label key={role} className={styles.roleRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={allowedRoles.includes(role)}
                onChange={(e) => handleToggleRole(role, e.target.checked)}
                aria-label={`Toggle ${roleLabel(role)} access to this course`}
              />
              {roleLabel(role)}
              {rowErrors[role] && <span className={styles.errorText}>{rowErrors[role]}</span>}
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Company access</h3>
        <p className={styles.adminNote}>Grant access to every Company Employee at a specific company.</p>
        <div className={styles.companyAddRow}>
          <select className={styles.companySelect} value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}>
            <option value="">Select a company…</option>
            {availableCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className={styles.addBtn} onClick={handleAddCompany} disabled={!selectedCompanyId}>
            Add
          </button>
        </div>

        {grantedCompanies.length === 0 ? (
          <p className={styles.emptyText}>No companies have access yet.</p>
        ) : (
          <ul className={styles.companyList}>
            {grantedCompanies.map((c) => (
              <li key={c.id} className={styles.companyRow}>
                <span>{c.name}</span>
                {rowErrors[c.id] && <span className={styles.errorText}>{rowErrors[c.id]}</span>}
                <button type="button" className={styles.removeBtn} onClick={() => handleRemoveCompany(c.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
