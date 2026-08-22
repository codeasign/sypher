'use client';

import React, { useRef, useState } from 'react';
import { createCourse, updateCourse, setCourseStatus, type Course } from '@/data/courses';
import { uploadToBunny } from '@/data/bunnyUpload';
import styles from './manage-courses.module.css';

const NAME_MAX = 80;

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

interface CourseEditorProps {
  course?: Course | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function CourseEditor({ course, onSaved, onCancel, onBack }: CourseEditorProps): React.JSX.Element {
  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
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
      const url = await uploadToBunny(file, `courses/${course?.slug ?? 'new'}/covers`, BUNNY_CONFIG);
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
        <label className={styles.fieldLabel} htmlFor="course-name">
          Name<span className={styles.requiredMark}>*</span>
        </label>
        <input
          id="course-name"
          type="text"
          className={styles.textInput}
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Course name"
          disabled={saving}
        />
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown to learners on the course home page"
          disabled={saving}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="course-cover">
          Cover image
        </label>
        {coverImageUrl && <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />}
        <input
          id="course-cover"
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverImageChange}
          disabled={saving || coverUploading}
        />
        {coverUploading && <p className={styles.uploadStatus}>Uploading…</p>}
      </div>
    </div>
  );
}
