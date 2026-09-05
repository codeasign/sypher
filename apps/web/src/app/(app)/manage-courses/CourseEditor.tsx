'use client';

import React, { useRef, useState } from 'react';
import { createCourse, updateCourse, setCourseStatus, AUDIENCE_ROLES, type Course } from '@/data/courses';
import { uploadToBunny } from '@/data/bunnyUpload';
import styles from './manage-courses.module.css';

const NAME_MAX = 250;
const DESCRIPTION_MAX = 500;

interface CourseEditorProps {
  course?: Course | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

const CATEGORY_OPTIONS = ['tech', 'life-skills'] as const;

// Audience-role select options: canonical list first, then any free-form
// value already stored on other courses (so nothing saved outside this
// list becomes uneditable).
function audienceRoleOptions(existing: string[]): { value: string; label: string }[] {
  const known = new Set(AUDIENCE_ROLES.map((r) => r.value));
  const extra = [...new Set(existing.filter((r) => !known.has(r)))].sort();
  return [...AUDIENCE_ROLES, ...extra.map((value) => ({ value, label: value }))];
}

function normalizeCsv(raw: string): string {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
}

export default function CourseEditor({ course, onSaved, onCancel, onBack }: CourseEditorProps): React.JSX.Element {
  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [category, setCategory] = useState(course?.category ?? '');
  const [relatedCourses, setRelatedCourses] = useState(course?.relatedCourses ?? '');
  const [audienceRole, setAudienceRole] = useState(course?.audienceRole ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(course?.coverImageUrl ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(course);
  const canSave = name.trim().length > 0 && !saving;

  async function handleCoverImageChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, `courses/${course?.slug ?? 'new'}/covers`);
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  }

  async function persist(nextStatus?: 'draft' | 'published'): Promise<string | null> {
    setSaving(true);
    setError(null);
    try {
      if (!isEditing) {
        const { error: createError, course: created } = await createCourse({
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl,
          category: category || '',
          relatedCourses: normalizeCsv(relatedCourses),
          audienceRole: audienceRole || '',
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create course.');
          return null;
        }
        if (nextStatus === 'published') {
          const { error: statusError } = await setCourseStatus(created.id, 'published');
          if (statusError) {
            setError(statusError);
            return null;
          }
        }
        return created.id;
      }

      const { error: updateError } = await updateCourse(course!.id, {
        name: name.trim(),
        description: description.trim() || null,
        coverImageUrl,
        // "" clears the value server-side; explicit nulls are rejected by
        // the API's tsoa validators.
        category: category || '',
        relatedCourses: normalizeCsv(relatedCourses),
        audienceRole: audienceRole || '',
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (nextStatus && nextStatus !== course!.status) {
        const { error: statusError } = await setCourseStatus(course!.id, nextStatus);
        if (statusError) {
          setError(statusError);
          return null;
        }
      }
      return course!.id;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft(): Promise<void> {
    const id = await persist('draft');
    if (id) onSaved();
  }

  async function handlePublishToggle(): Promise<void> {
    const nextStatus = course?.status === 'published' ? 'draft' : 'published';
    const id = await persist(nextStatus);
    if (id) onSaved();
  }

  async function handleRepublish(): Promise<void> {
    const id = await persist('published');
    if (id) onSaved();
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back to courses
          </button>
        )}
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {isEditing ? (
          <button type="button" className={styles.publishBtn} onClick={handleRepublish} disabled={!canSave}>
            {course!.status === 'published' ? 'Republish' : 'Publish'}
          </button>
        ) : (
          <>
            <button type="button" className={styles.draftBtn} onClick={handleSaveDraft} disabled={!canSave}>
              Save Draft
            </button>
            <button type="button" className={styles.publishBtn} onClick={handlePublishToggle} disabled={!canSave}>
              Publish
            </button>
          </>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formGroup}>
        <div className={styles.coverHeaderRow}>
          <label className={styles.fieldLabel} htmlFor="course-cover">
            Cover image
          </label>
          <input
            id="course-cover"
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleCoverImageChange}
            disabled={saving || coverUploading}
          />
        </div>
        {coverImageUrl && <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />}
        {coverUploading && <p className={styles.uploadStatus}>Uploading…</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-name">
          Name<span className={styles.requiredMark}>*</span>
        </label>
        <textarea
          id="course-name"
          className={`${styles.textInput} ${styles.nameArea}`}
          rows={2}
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value.replace(/\n/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Course name"
          disabled={saving}
        />
        <span className={styles.charCount}>
          {name.length}/{NAME_MAX}
        </span>
        {isEditing && <p className={styles.slugPreview}>/learn/{course!.slug}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-description">
          Description
        </label>
        <textarea
          id="course-description"
          className={styles.textArea}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown to learners on the course home page"
          disabled={saving}
        />
        <span className={styles.charCount}>
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-category">
          Category
        </label>
        <select
          id="course-category"
          className={styles.textInput}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={saving}
        >
          <option value="">None</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-audience-role">
          Audience role
        </label>
        <select
          id="course-audience-role"
          className={styles.textInput}
          value={audienceRole}
          onChange={(e) => setAudienceRole(e.target.value)}
          disabled={saving}
        >
          <option value="">None</option>
          {audienceRoleOptions(course?.audienceRole ? [course.audienceRole] : []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-related">
          Related courses
        </label>
        <input
          id="course-related"
          type="text"
          className={styles.textInput}
          value={relatedCourses}
          onChange={(e) => setRelatedCourses(e.target.value)}
          placeholder="Comma-separated course slugs, e.g. learn-typescript,agentic-ai-fundamentals"
          disabled={saving}
        />
      </div>
    </div>
  );
}
