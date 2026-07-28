'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAuthoredCourseAccess,
  setAuthoredCourseRoles,
  listAuthoredCourseCompanyGrants,
  setAuthoredCourseCompanyAccess,
  fetchDistinctCompanyNames,
} from '@/data/authoredCourseAccess';
import { GLOBALLY_CONFIGURABLE_ROLES } from '@/types/roles';
import type { Role } from '@/types/roles';
import { trackEvent } from '@/lib/analytics';
import styles from './AccessTab.module.css';

interface AccessTabProps {
  courseId: string;
}

interface AccessData {
  allowedRoles: Role[];
  companies: string[];
}

export default function AccessTab({ courseId }: AccessTabProps): React.JSX.Element {
  const { supabase } = useAuth();
  const { mutate } = useSWRConfig();
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const swrKey = supabase ? `courseAccess:${courseId}` : null;
  const {
    data,
    isLoading: loading,
    error: swrError,
    mutate: refetch,
  } = useSWR<AccessData>(swrKey, async (): Promise<AccessData> => {
    const [access, grants] = await Promise.all([
      getAuthoredCourseAccess(supabase, courseId),
      listAuthoredCourseCompanyGrants(supabase, courseId),
    ]);
    return {
      allowedRoles: (access?.allowed_roles ?? []) as Role[],
      companies: (grants as { company_name: string }[]).map((g) => g.company_name),
    };
  });
  const allowedRoles = data?.allowedRoles ?? [];
  const companies = data?.companies ?? [];
  const error = !supabase
    ? 'Auth is not configured. Check Supabase environment variables.'
    : swrError
    ? 'Failed to load access.'
    : null;

  useEffect(() => {
    fetchDistinctCompanyNames(supabase).then(setCompanyOptions);
  }, [supabase]);

  async function handleToggleRole(role: Role, checked: boolean): Promise<void> {
    const nextRoles = checked ? [...allowedRoles, role] : allowedRoles.filter((r) => r !== role);
    setRowErrors((p) => ({ ...p, [role]: '' }));
    if (swrKey) mutate(swrKey, { allowedRoles: nextRoles, companies }, false);

    const { error: updateError } = await setAuthoredCourseRoles(supabase, courseId, nextRoles);
    if (updateError) {
      setRowErrors((p) => ({ ...p, [role]: updateError }));
      if (swrKey) mutate(swrKey, { allowedRoles, companies }, false);
    }
    trackEvent('managecourses_access_role_toggle', { course_id: courseId, role, granted: checked });
  }

  async function handleAddCompany(): Promise<void> {
    const trimmed = companyInput.trim();
    if (!trimmed || companies.includes(trimmed)) {
      setCompanyInput('');
      return;
    }
    setRowErrors((p) => ({ ...p, [trimmed]: '' }));
    const { error: updateError } = await setAuthoredCourseCompanyAccess(supabase, courseId, trimmed, true);
    if (updateError) {
      setRowErrors((p) => ({ ...p, [trimmed]: updateError }));
      return;
    }
    if (swrKey) mutate(swrKey, { allowedRoles, companies: [...companies, trimmed] }, false);
    setCompanyInput('');
    trackEvent('managecourses_access_company_add', { course_id: courseId });
  }

  async function handleRemoveCompany(name: string): Promise<void> {
    setRowErrors((p) => ({ ...p, [name]: '' }));
    const { error: updateError } = await setAuthoredCourseCompanyAccess(supabase, courseId, name, false);
    if (updateError) {
      setRowErrors((p) => ({ ...p, [name]: updateError }));
      return;
    }
    if (swrKey) mutate(swrKey, { allowedRoles, companies: companies.filter((c) => c !== name) }, false);
    trackEvent('managecourses_access_company_remove', { course_id: courseId });
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Roles</h3>
        <p className={styles.adminNote}>Admin always has access to every course.</p>
        <div className={styles.roleGrid}>
          {GLOBALLY_CONFIGURABLE_ROLES.map((r) => (
            <label key={r.value} className={styles.roleRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={allowedRoles.includes(r.value)}
                onChange={(e) => handleToggleRole(r.value, e.target.checked)}
                aria-label={`Toggle ${r.label} access to this course`}
              />
              {r.label}
              {rowErrors[r.value] && <span className={styles.rowError}>{rowErrors[r.value]}</span>}
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Company access</h3>
        <p className={styles.adminNote}>Grant access to every Company Employee at a specific company.</p>
        <div className={styles.companyAddRow}>
          <input
            type="text"
            className={styles.searchInput}
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompany(); } }}
            placeholder="Company name"
            list="access-tab-company-options"
          />
          <datalist id="access-tab-company-options">
            {companyOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button type="button" className={styles.addBtn} onClick={handleAddCompany} disabled={!companyInput.trim()}>
            Add
          </button>
        </div>

        {companies.length === 0 ? (
          <p className={styles.emptyText}>No companies have access yet.</p>
        ) : (
          <ul className={styles.companyList}>
            {companies.map((name) => (
              <li key={name} className={styles.companyRow}>
                <span>{name}</span>
                {rowErrors[name] && <span className={styles.rowError}>{rowErrors[name]}</span>}
                <button type="button" className={styles.removeBtn} onClick={() => handleRemoveCompany(name)}>
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
