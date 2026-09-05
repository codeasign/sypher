'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
} from '@mdxeditor/editor';
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import { useColorMode } from '@/hooks/useColorMode';
import { useAuth } from '@/contexts/AuthContext';
import { createCohort, updateCohort, setCohortStatus, slugify } from '@/data/cohorts';
import { uploadToBunny } from '@/data/bunnyUpload';
import CohortArticle from '@/components/CohortPostPage/CohortArticle';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

function EyeIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface Cohort {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  cover_image_url: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  seats_total: number | null;
  price_label: string | null;
  status: 'draft' | 'live' | 'closed';
}

interface CohortEditorProps {
  cohort?: Cohort | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function CohortEditorInner({ cohort, onSaved, onCancel, onBack }: CohortEditorProps): React.JSX.Element {
  const { supabase, user } = useAuth();
  const { colorMode } = useColorMode();
  const isEditing = Boolean(cohort);

  const [title, setTitle] = useState(cohort?.title ?? '');
  const [description, setDescription] = useState(cohort?.description ?? '');
  const [content, setContent] = useState(cohort?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(cohort?.cover_image_url ?? '');
  const [startDate, setStartDate] = useState(cohort?.start_date ?? '');
  const [durationWeeks, setDurationWeeks] = useState(cohort?.duration_weeks?.toString() ?? '');
  const [seatsTotal, setSeatsTotal] = useState(cohort?.seats_total?.toString() ?? '');
  const [priceLabel, setPriceLabel] = useState(cohort?.price_label ?? '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);

  function togglePreview(): void {
    if (previewMode) {
      // Remounts the editor so it re-reads `content` fresh rather than
      // resuming whatever internal cursor/undo state it had before being
      // unmounted while the preview was showing.
      setEditorInstanceKey((key) => key + 1);
    }
    setPreviewMode((mode) => !mode);
  }

  async function handleCoverUpload(file: File): Promise<void> {
    setCoverUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'cohorts/covers');
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  }

  function currentFields() {
    return {
      title,
      description,
      content,
      coverImageUrl: coverImageUrl || null,
      startDate: startDate || null,
      durationWeeks: durationWeeks ? Number(durationWeeks) : null,
      seatsTotal: seatsTotal ? Number(seatsTotal) : null,
      priceLabel: priceLabel || null,
    };
  }

  async function persist(nextStatus?: 'draft' | 'live' | 'closed'): Promise<void> {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (!isEditing) {
        const { error: createError, cohort: created } = await createCohort(supabase, {
          ...currentFields(),
          createdBy: user?.id,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create cohort.');
          return;
        }
        if (nextStatus) {
          const { error: statusError } = await setCohortStatus(supabase, created.id, nextStatus);
          if (statusError) {
            setError(statusError);
            return;
          }
        }
      } else {
        const fields = currentFields();
        const { error: updateError } = await updateCohort(supabase, cohort!.id, {
          title: fields.title,
          description: fields.description,
          content: fields.content,
          cover_image_url: fields.coverImageUrl,
          start_date: fields.startDate,
          duration_weeks: fields.durationWeeks,
          seats_total: fields.seatsTotal,
          price_label: fields.priceLabel,
        });
        if (updateError) {
          setError(updateError);
          return;
        }
        if (nextStatus && nextStatus !== cohort!.status) {
          const { error: statusError } = await setCohortStatus(supabase, cohort!.id, nextStatus);
          if (statusError) {
            setError(statusError);
            return;
          }
        }
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back to cohorts
          </button>
        )}
        <button
          type="button"
          className={clsx(styles.toolbarBtn, previewMode && styles.toolbarBtnActive)}
          onClick={togglePreview}
        >
          {previewMode ? <EyeOffIcon /> : <EyeIcon />}
          {previewMode ? 'Edit' : 'Preview'}
        </button>
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={styles.draftBtn} disabled={saving} onClick={() => persist('draft')}>
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button type="button" className={styles.publishBtn} disabled={saving} onClick={() => persist('live')}>
          {saving ? 'Saving…' : isEditing && cohort!.status === 'live' ? 'Republish' : 'Publish (Live)'}
        </button>
        {isEditing && cohort!.status === 'live' && (
          <button type="button" className={styles.closeBtn} disabled={saving} onClick={() => persist('closed')}>
            Close
          </button>
        )}
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      {previewMode ? (
        <CohortArticle
          slug={cohort?.slug ?? 'preview'}
          title={title || 'Untitled cohort'}
          content={content}
          coverImageUrl={coverImageUrl || null}
          startDate={startDate || null}
          durationWeeks={durationWeeks ? Number(durationWeeks) : null}
          seatsTotal={seatsTotal ? Number(seatsTotal) : null}
          priceLabel={priceLabel || null}
          trackView={false}
          showBackLink={false}
          showInterestForm={false}
        />
      ) : (
        <>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="cohort-title">Title</label>
            <input id="cohort-title" type="text" className={styles.textInput} value={title} onChange={(e) => setTitle(e.target.value)} />
            {title && <p className={styles.slugPreview}>Slug: {isEditing ? cohort!.slug : slugify(title)}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="cohort-description">Short description (card + SEO, max 120 chars)</label>
            <input id="cohort-description" type="text" maxLength={120} className={styles.textInput} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="cohort-start-date">Start date</label>
              <input id="cohort-start-date" type="date" className={styles.textInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="cohort-duration">Duration (weeks)</label>
              <input id="cohort-duration" type="number" min={1} className={styles.textInput} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="cohort-seats">Seats (informational only — not enforced)</label>
              <input id="cohort-seats" type="number" min={1} className={styles.textInput} value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="cohort-price">Price label</label>
              <input id="cohort-price" type="text" placeholder="e.g. $499 or Free" className={styles.textInput} value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Cover image</label>
            {coverImageUrl && <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />}
            <input
              type="file"
              accept="image/*"
              disabled={coverUploading}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoverUpload(file); }}
            />
            {coverUploading && <p className={styles.uploadStatus}>Uploading…</p>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="cohort-content">Details (markdown)</label>
            <div className={styles.mdxWrapper}>
              <MDXEditor
                key={editorInstanceKey}
                className={colorMode === 'dark' ? 'dark-theme' : undefined}
                contentEditableClassName={styles.mdxContentEditable}
                markdown={content}
                onChange={setContent}
                placeholder="Curriculum, prerequisites, what learners will build…"
                readOnly={saving}
                plugins={[
                  headingsPlugin(),
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
                        <BlockTypeSelect />
                        <ListsToggle />
                        <CreateLink />
                      </>
                    ),
                  }),
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
