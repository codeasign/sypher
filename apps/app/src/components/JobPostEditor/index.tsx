'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createJobPost, updateJobPost, setJobPostStatus } from '@/data/jobPosts';
import styles from './styles.module.css';

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

interface JobPost {
  id: string;
  company_name?: string | null;
  title: string;
  description: string;
  location: string | null;
  employment_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  apply_email: string | null;
  status: 'draft' | 'open' | 'closed';
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
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [location, setLocation] = useState(post?.location ?? '');
  const [employmentType, setEmploymentType] = useState(post?.employment_type ?? '');
  const [experienceLevel, setExperienceLevel] = useState(post?.experience_level ?? '');
  const [salaryMin, setSalaryMin] = useState(post?.salary_min != null ? String(post.salary_min) : '');
  const [salaryMax, setSalaryMax] = useState(post?.salary_max != null ? String(post.salary_max) : '');
  const [applyUrl, setApplyUrl] = useState(post?.apply_url ?? '');
  const [applyEmail, setApplyEmail] = useState(post?.apply_email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(post);
  const canSave =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    (applyUrl.trim().length > 0 || applyEmail.trim().length > 0) &&
    (!isExternalPoster || postCompanyName.trim().length > 0) &&
    !saving;

  function currentFields() {
    return {
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || null,
      employmentType: employmentType || null,
      experienceLevel: experienceLevel.trim() || null,
      salaryMin: salaryMin.trim() ? Number(salaryMin) : null,
      salaryMax: salaryMax.trim() ? Number(salaryMax) : null,
      applyUrl: applyUrl.trim() || null,
      applyEmail: applyEmail.trim() || null,
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
        return created.id;
      }

      const fields = currentFields();
      const { error: updateError } = await updateJobPost(supabase, post!.id, {
        title: fields.title,
        description: fields.description,
        location: fields.location,
        employment_type: fields.employmentType,
        experience_level: fields.experienceLevel,
        salary_min: fields.salaryMin,
        salary_max: fields.salaryMax,
        apply_url: fields.applyUrl,
        apply_email: fields.applyEmail,
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
        {isExternalPoster && (
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
            <label className={styles.fieldLabel} htmlFor="job-location">
              Location
            </label>
            <input
              id="job-location"
              type="text"
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Remote, Bengaluru"
              disabled={saving}
            />
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
            <label className={styles.fieldLabel} htmlFor="job-experience-level">
              Experience level
            </label>
            <input
              id="job-experience-level"
              type="text"
              className={styles.input}
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              placeholder="e.g. 3-5 years"
              disabled={saving}
            />
          </div>
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
        <p className={styles.fieldHint}>At least one of Apply URL or Apply email is required.</p>
      </div>
    </div>
  );
}
