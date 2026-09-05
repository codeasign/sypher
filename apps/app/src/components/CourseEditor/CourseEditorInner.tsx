'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import {
  MDXEditor,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  markdownShortcutPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  ListsToggle,
  CreateLink,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse, setCourseStatus } from '@/data/courses';
import { uploadToBunny } from '@/data/bunnyUpload';
import { trackEvent } from '@/lib/analytics';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

const NAME_MAX = 80;

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published';
}

interface CourseEditorProps {
  course?: Course | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function CourseEditorInner({ course, onSaved, onCancel, onBack }: CourseEditorProps): React.JSX.Element {
  const { supabase, user } = useAuth();
  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(course?.cover_image_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<MDXEditorMethods>(null);

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
    const descriptionMarkdown = (descriptionEditorRef.current?.getMarkdown() ?? description).trim();

    try {
      if (!isEditing) {
        const { error: createError, course: created } = await createCourse(supabase, {
          name: name.trim(),
          description: descriptionMarkdown || null,
          coverImageUrl,
          authorId: user?.id ?? null,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create course.');
          return null;
        }
        if (nextStatus === 'published') {
          const { error: statusError } = await setCourseStatus(supabase, created.id, 'published');
          if (statusError) {
            setError(statusError);
            return null;
          }
        }
        return created.id;
      }

      const { error: updateError } = await updateCourse(supabase, course!.id, {
        name: name.trim(),
        description: descriptionMarkdown || null,
        cover_image_url: coverImageUrl,
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (nextStatus && nextStatus !== course!.status) {
        const { error: statusError } = await setCourseStatus(supabase, course!.id, nextStatus);
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
    trackEvent('managecourses_save_draft_click');
    const id = await persist('draft');
    if (id) onSaved();
  }

  async function handlePublishToggle(): Promise<void> {
    const nextStatus = course?.status === 'published' ? 'draft' : 'published';
    const id = await persist(nextStatus);
    if (id) {
      if (nextStatus === 'published') {
        trackEvent('managecourses_publish_click', { course_id: id });
      } else {
        trackEvent('managecourses_status_change', { course_id: id, from_status: 'published', to_status: 'draft' });
      }
      onSaved();
    }
  }

  async function handleRepublish(): Promise<void> {
    const id = await persist('published');
    if (id) {
      trackEvent('managecourses_publish_click', { course_id: id });
      onSaved();
    }
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
            Republish
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

      <div className={clsx(styles.card)}>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor="course-name">
            Name<span className={styles.requiredMark}>*</span>
          </label>
          <input
            id="course-name"
            type="text"
            className={styles.titleInput}
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course name"
            disabled={saving}
          />
          <div className={styles.fieldMetaRow}>
            <span className={styles.fieldHint}>
              {isEditing ? <span className={styles.slugValue}>/courses/{course!.slug}</span> : 'Slug is generated from the name once saved'}
            </span>
            <span className={styles.charCount}>
              {name.length}/{NAME_MAX}
            </span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor="course-description">
            Description
          </label>
          <div className={styles.mdxWrapper}>
            <MDXEditor
              ref={descriptionEditorRef}
              contentEditableClassName={styles.mdxContentEditable}
              markdown={description}
              onChange={(markdown) => setDescription(markdown)}
              onError={({ error: mdxError }) => setError(mdxError)}
              plugins={[
                listsPlugin(),
                quotePlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                markdownShortcutPlugin(),
                hardLineBreakPlugin(),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <BoldItalicUnderlineToggles />
                      <ListsToggle />
                      <CreateLink />
                    </>
                  ),
                }),
              ]}
            />
          </div>
          <p className={styles.fieldHint}>Shown to learners on the course home page</p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel} htmlFor="course-cover">
            Cover image
          </label>
          <div className={styles.coverField}>
            {coverImageUrl && <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />}
            <label htmlFor="course-cover" className={styles.coverUploadLabel}>
              {coverImageUrl ? 'Replace image' : 'Upload image'}
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
            {coverUploading && <span className={styles.uploadingNote}>Uploading…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
