'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createJobPost, updateJobPost, setJobPostStatus } from '@/data/jobPosts';
import { getJobPostSkills, setJobPostSkills } from '@/data/jobPostSkills';
import { listCompanyBrandings } from '@/data/companyBranding';
import { fetchTaxonomy } from '@/data/taxonomy';
import { fetchLocations } from '@/data/locations';
import { EXPERIENCE_YEARS_OPTIONS, EXPERIENCE_MONTHS_OPTIONS } from '@/types/educationStatus';
import { WORK_MODE_OPTIONS } from '@/types/workMode';
import SkillsModal from '@/components/SkillsModal';
import styles from './styles.module.css';

interface TaxonomyCatalog {
  domains: { id: string; name: string; roleIds: string[]; skillIds: string[]; technologyIds: string[] }[];
  roles: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  technologies: { id: string; name: string }[];
}

interface LocationsCatalog {
  states: { id: string; name: string; slug: string; locationIds: string[] }[];
  locations: { id: string; name: string; slug: string; stateId: string }[];
}

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

interface JobPost {
  id: string;
  company_name?: string | null;
  title: string;
  description: string;
  location: string | null;
  employment_type: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  apply_email: string | null;
  include_branding?: boolean;
  status: 'draft' | 'open' | 'closed';
  category_domain_id?: string | null;
  category_role_id?: string | null;
  required_experience_years?: number | null;
  required_experience_months?: number | null;
}

interface JobPostEditorProps {
  post?: JobPost | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function JobPostEditor({ post, onSaved, onCancel, onBack }: JobPostEditorProps): React.JSX.Element {
  const { supabase, user, companyName, role } = useAuth();
  const isExternalPoster = role === 'external_job_poster';
  const [postCompanyName, setPostCompanyName] = useState(post?.company_name ?? '');
  const [brandingOptions, setBrandingOptions] = useState<
    Array<{ company_name: string; display_name: string | null }>
  >([]);
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [location, setLocation] = useState(post?.location ?? '');
  const [employmentType, setEmploymentType] = useState(post?.employment_type ?? '');
  const [workMode, setWorkMode] = useState(post?.work_mode ?? '');
  const [salaryMin, setSalaryMin] = useState(post?.salary_min != null ? String(post.salary_min) : '');
  const [salaryMax, setSalaryMax] = useState(post?.salary_max != null ? String(post.salary_max) : '');
  const [applyUrl, setApplyUrl] = useState(post?.apply_url ?? '');
  const [applyEmail, setApplyEmail] = useState(post?.apply_email ?? '');
  const [includeBranding, setIncludeBranding] = useState(post?.include_branding ?? false);
  const [categoryDomainInput, setCategoryDomainInput] = useState(post?.category_domain_id ?? '');
  const [categoryRoleInput, setCategoryRoleInput] = useState(post?.category_role_id ?? '');
  const [requiredExperienceYears, setRequiredExperienceYears] = useState<number | null>(
    post?.required_experience_years ?? null
  );
  const [requiredExperienceMonths, setRequiredExperienceMonths] = useState<number | null>(
    post?.required_experience_months ?? null
  );
  const [taxonomyCatalog, setTaxonomyCatalog] = useState<TaxonomyCatalog | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [locationsCatalog, setLocationsCatalog] = useState<LocationsCatalog | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationStateId, setLocationStateId] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isExternalPoster || !supabase || !user?.id) return;
    let active = true;
    listCompanyBrandings(supabase, user.id).then((rows) => {
      if (active) setBrandingOptions(rows);
    });
    return () => {
      active = false;
    };
  }, [supabase, user?.id, isExternalPoster]);

  useEffect(() => {
    let active = true;
    fetchTaxonomy(process.env.NEXT_PUBLIC_API_BASE_URL)
      .then((data) => {
        if (active) setTaxonomyCatalog(data as TaxonomyCatalog);
      })
      .catch((err) => {
        if (active) setTaxonomyError(err instanceof Error ? err.message : 'Failed to load skills catalog');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !post?.id) return;
    getJobPostSkills(supabase, post.id).then((rows: { skill_id: string }[]) =>
      setSelectedSkillIds(rows.map((r) => r.skill_id))
    );
  }, [supabase, post?.id]);

  useEffect(() => {
    let active = true;
    fetchLocations(process.env.NEXT_PUBLIC_API_BASE_URL)
      .then((data) => {
        if (active) setLocationsCatalog(data as LocationsCatalog);
      })
      .catch((err) => {
        if (active) setLocationsError(err instanceof Error ? err.message : 'Failed to load locations catalog');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!locationsCatalog || !post?.location) return;
    const match = locationsCatalog.locations.find(
      (l) => l.name.toLowerCase() === post.location!.toLowerCase()
    );
    if (match) setLocationStateId(match.stateId);
  }, [locationsCatalog, post?.location]);

  const selectedCategoryDomain = taxonomyCatalog?.domains.find((d) => d.id === categoryDomainInput) ?? null;
  const rolesForSelectedDomain = selectedCategoryDomain
    ? taxonomyCatalog!.roles.filter((r) => selectedCategoryDomain.roleIds.includes(r.id))
    : [];
  const skillsForSelectedDomain = selectedCategoryDomain
    ? (taxonomyCatalog?.skills ?? []).filter((s) => selectedCategoryDomain.skillIds.includes(s.id))
    : [];
  const locationsForSelectedState = (locationsCatalog?.locations ?? []).filter(
    (l) => l.stateId === locationStateId
  );

  function handleCategoryDomainChange(domainId: string): void {
    setCategoryDomainInput(domainId);
    setCategoryRoleInput('');
  }

  const isEditing = Boolean(post);
  const canSave =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    (!isExternalPoster || postCompanyName.trim().length > 0) &&
    !saving;

  function currentFields() {
    return {
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || null,
      employmentType: employmentType || null,
      workMode: workMode || null,
      salaryMin: salaryMin.trim() ? Number(salaryMin) : null,
      salaryMax: salaryMax.trim() ? Number(salaryMax) : null,
      applyUrl: applyUrl.trim() || null,
      applyEmail: applyEmail.trim() || null,
      includeBranding,
      categoryDomainId: categoryDomainInput || null,
      categoryRoleId: categoryRoleInput || null,
      requiredExperienceYears,
      requiredExperienceMonths,
    };
  }

  async function persist(nextStatus?: 'draft' | 'open' | 'closed'): Promise<string | null> {
    setSaving(true);
    setError(null);
    try {
      if (!isEditing) {
        const { error: createError, post: created } = await createJobPost(supabase, {
          companyName: isExternalPoster ? postCompanyName.trim() : companyName,
          ...currentFields(),
          createdBy: user?.id ?? null,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create job post.');
          return null;
        }
        if (nextStatus && nextStatus !== 'draft') {
          const { error: statusError } = await setJobPostStatus(supabase, created.id, nextStatus);
          if (statusError) {
            setError(statusError);
            return null;
          }
        }
        await setJobPostSkills(supabase, created.id, selectedSkillIds);
        return created.id;
      }

      const fields = currentFields();
      const { error: updateError } = await updateJobPost(supabase, post!.id, {
        title: fields.title,
        description: fields.description,
        location: fields.location,
        employment_type: fields.employmentType,
        work_mode: fields.workMode,
        salary_min: fields.salaryMin,
        salary_max: fields.salaryMax,
        apply_url: fields.applyUrl,
        apply_email: fields.applyEmail,
        include_branding: fields.includeBranding,
        category_domain_id: fields.categoryDomainId,
        category_role_id: fields.categoryRoleId,
        required_experience_years: fields.requiredExperienceYears,
        required_experience_months: fields.requiredExperienceMonths,
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (nextStatus && nextStatus !== post!.status) {
        const { error: statusError } = await setJobPostStatus(supabase, post!.id, nextStatus);
        if (statusError) {
          setError(statusError);
          return null;
        }
      }
      await setJobPostSkills(supabase, post!.id, selectedSkillIds);
      return post!.id;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft(): Promise<void> {
    const id = await persist('draft');
    if (id) onSaved();
  }

  async function handlePublish(): Promise<void> {
    const id = await persist('open');
    if (id) onSaved();
  }

  async function handleSave(): Promise<void> {
    const id = await persist();
    if (id) onSaved();
  }

  async function handleClose(): Promise<void> {
    const id = await persist('closed');
    if (id) onSaved();
  }

  async function handleReopen(): Promise<void> {
    const id = await persist('open');
    if (id) onSaved();
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back to job posts
          </button>
        )}
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {!isEditing && (
          <>
            <button type="button" className={styles.draftBtn} onClick={handleSaveDraft} disabled={!canSave}>
              Save Draft
            </button>
            <button type="button" className={styles.publishBtn} onClick={handlePublish} disabled={!canSave}>
              Publish
            </button>
          </>
        )}
        {isEditing && post!.status === 'draft' && (
          <>
            <button type="button" className={styles.draftBtn} onClick={handleSave} disabled={!canSave}>
              Save
            </button>
            <button type="button" className={styles.publishBtn} onClick={handlePublish} disabled={!canSave}>
              Publish
            </button>
          </>
        )}
        {isEditing && post!.status === 'open' && (
          <>
            <button type="button" className={styles.draftBtn} onClick={handleSave} disabled={!canSave}>
              Save
            </button>
            <button type="button" className={styles.closeBtn} onClick={handleClose} disabled={!canSave}>
              Close Posting
            </button>
          </>
        )}
        {isEditing && post!.status === 'closed' && (
          <>
            <button type="button" className={styles.draftBtn} onClick={handleSave} disabled={!canSave}>
              Save
            </button>
            <button type="button" className={styles.publishBtn} onClick={handleReopen} disabled={!canSave}>
              Reopen
            </button>
          </>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        {isExternalPoster && brandingOptions.length > 1 && (
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-company-branding">
              Company Branding<span className={styles.requiredMark}>*</span>
            </label>
            <select
              id="job-company-branding"
              className={styles.select}
              value={brandingOptions.some((b) => b.company_name === postCompanyName) ? postCompanyName : ''}
              onChange={(e) => setPostCompanyName(e.target.value)}
              disabled={saving}
            >
              <option value="">Select a company</option>
              {brandingOptions.map((b) => (
                <option key={b.company_name} value={b.company_name}>
                  {b.display_name || b.company_name}
                </option>
              ))}
            </select>
            <p className={styles.fieldHint}>
              You've created branding for multiple companies — pick which one this job post is for.
            </p>
          </div>
        )}
        {isExternalPoster && brandingOptions.length <= 1 && (
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-company-name">
              Company Name<span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="job-company-name"
              type="text"
              className={styles.input}
              value={postCompanyName}
              onChange={(e) => setPostCompanyName(e.target.value)}
              placeholder="Company this job post is for"
              disabled={saving}
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor="job-title">
            Title<span className={styles.requiredMark}>*</span>
          </label>
          <input
            id="job-title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            disabled={saving}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Domain &amp; Role</label>
            <div className={styles.cascadeRow}>
              <select
                className={styles.select}
                value={categoryDomainInput}
                onChange={(e) => handleCategoryDomainChange(e.target.value)}
                disabled={saving}
              >
                <option value="">Select a domain…</option>
                {(taxonomyCatalog?.domains ?? []).map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.select}
                value={categoryRoleInput}
                onChange={(e) => setCategoryRoleInput(e.target.value)}
                disabled={saving || !categoryDomainInput}
              >
                <option value="">Select a role…</option>
                {rolesForSelectedDomain.map((role_) => (
                  <option key={role_.id} value={role_.id}>
                    {role_.name}
                  </option>
                ))}
              </select>
            </div>
            {taxonomyError ? <p className={styles.error}>{taxonomyError}</p> : null}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-employment-type">
              Employment type
            </label>
            <select
              id="job-employment-type"
              className={styles.select}
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              disabled={saving}
            >
              <option value="">Select type</option>
              {EMPLOYMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Required Experience</label>
            <div className={styles.cascadeRow}>
              <select
                className={styles.select}
                value={requiredExperienceYears ?? ''}
                onChange={(e) => setRequiredExperienceYears(e.target.value ? Number(e.target.value) : null)}
                disabled={saving}
              >
                <option value="">Years…</option>
                {EXPERIENCE_YEARS_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                className={styles.select}
                value={requiredExperienceMonths ?? ''}
                onChange={(e) => setRequiredExperienceMonths(e.target.value ? Number(e.target.value) : null)}
                disabled={saving}
              >
                <option value="">Months…</option>
                {EXPERIENCE_MONTHS_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-work-mode">
              Work mode
            </label>
            <select
              id="job-work-mode"
              className={styles.select}
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              disabled={saving}
            >
              <option value="">Select work mode</option>
              {WORK_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Skills</label>
          <button
            type="button"
            className={styles.addItemBtn}
            onClick={() => setIsSkillsModalOpen(true)}
            disabled={saving}
          >
            Skills
          </button>
          {selectedSkillIds.length > 0 ? (
            <div className={styles.skillChipRow}>
              {selectedSkillIds.map((skillId) => {
                const skill = taxonomyCatalog?.skills.find((s) => s.id === skillId);
                return (
                  <span key={skillId} className={styles.skillChip}>
                    {skill?.name ?? skillId}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className={styles.helpText}>No skills selected yet.</p>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Location</label>
            <div className={styles.cascadeRow}>
              <select
                className={styles.select}
                value={locationStateId}
                onChange={(e) => {
                  setLocationStateId(e.target.value);
                  setLocation('');
                }}
                disabled={saving}
              >
                <option value="">Select a state</option>
                {(locationsCatalog?.states ?? []).map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.select}
                value={locationsForSelectedState.some((l) => l.name === location) ? location : ''}
                onChange={(e) => setLocation(e.target.value)}
                disabled={saving || !locationStateId}
              >
                <option value="">Select a location</option>
                {locationsForSelectedState.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            {locationsError ? <p className={styles.error}>{locationsError}</p> : null}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel} htmlFor="job-include-branding">
              <input
                id="job-include-branding"
                type="checkbox"
                checked={includeBranding}
                onChange={(e) => setIncludeBranding(e.target.checked)}
                disabled={saving}
              />
              Include company branding
            </label>
            <p className={styles.fieldHint}>Shows your company's logo, tagline, and about text alongside this job.</p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor="job-description">
            Description<span className={styles.requiredMark}>*</span>
          </label>
          <textarea
            id="job-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Role responsibilities, requirements, and what the candidate will be doing"
            rows={8}
            disabled={saving}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Salary range (INR/year)</label>
            <div className={styles.row}>
              <input
                type="number"
                className={styles.input}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="Min"
                disabled={saving}
              />
              <input
                type="number"
                className={styles.input}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Max"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-apply-url">
              Apply URL
            </label>
            <input
              id="job-apply-url"
              type="url"
              className={styles.input}
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="https://..."
              disabled={saving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="job-apply-email">
              Apply email
            </label>
            <input
              id="job-apply-email"
              type="email"
              className={styles.input}
              value={applyEmail}
              onChange={(e) => setApplyEmail(e.target.value)}
              placeholder="careers@company.com"
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <SkillsModal
        open={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        allSkills={skillsForSelectedDomain}
        selectedSkillIds={selectedSkillIds}
        onSave={setSelectedSkillIds}
      />
    </div>
  );
}
