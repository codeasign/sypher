'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createCohort, updateCohort, setCohortStatus, slugify } from '@/data/cohorts';
import { uploadToBunny } from '@/data/bunnyUpload';
import styles from './styles.module.css';

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
}

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

export default function CohortEditor({ cohort, onSaved, onCancel }: CohortEditorProps): React.JSX.Element {
  const { supabase, user } = useAuth();
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

  async function handleCoverUpload(file: File): Promise<void> {
    setCoverUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'cohorts/covers', BUNNY_CONFIG);
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
      <button type="button" className={styles.backBtn} onClick={onCancel}>← Back</button>

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
        <textarea id="cohort-content" className={styles.contentTextarea} rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} disabled={saving} onClick={() => persist('draft')}>
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button type="button" className={styles.primaryBtn} disabled={saving} onClick={() => persist('live')}>
          {saving ? 'Saving…' : isEditing && cohort!.status === 'live' ? 'Republish' : 'Publish (Live)'}
        </button>
        {isEditing && cohort!.status === 'live' && (
          <button type="button" className={styles.dangerBtn} disabled={saving} onClick={() => persist('closed')}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
