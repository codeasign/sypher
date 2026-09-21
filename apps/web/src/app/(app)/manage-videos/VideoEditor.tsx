'use client';

import { FileArchive } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { createVideo, updateVideo, setVideoStatus, type Video, type VideoResource } from '@/data/videos';
import { uploadToBunny } from '@/data/bunnyUpload';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from '../manage-courses/manage-courses.module.css';

const TITLE_MAX = 200;

function ZipIcon(): React.JSX.Element {
  return (
    <FileArchive size={14} />
  );
}

interface VideoEditorProps {
  video?: Video | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function VideoEditor({ video, onSaved, onCancel, onBack }: VideoEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(video?.title ?? '');
  const [description, setDescription] = useState(video?.description ?? '');
  const [category, setCategory] = useState(video?.category ?? '');
  const [transcript, setTranscript] = useState(video?.transcript ?? '');
  const [resources, setResources] = useState<VideoResource[]>(video?.resources ?? []);
  const [resourceUploading, setResourceUploading] = useState<boolean[]>((video?.resources ?? []).map(() => false));
  const [videoUrl, setVideoUrl] = useState<string | null>(video?.videoUrl ?? null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(video?.thumbnailUrl ?? null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const isEditing = Boolean(video);
  const canSave = title.trim().length > 0 && !saving;

  async function handleVideoFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'videos/files');
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video file.');
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'videos/thumbnails');
      setThumbnailUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload thumbnail.');
    } finally {
      setThumbnailUploading(false);
    }
  }

  function addResource(): void {
    setResources((prev) => [...prev, { label: '', url: '' }]);
    setResourceUploading((prev) => [...prev, false]);
  }

  function updateResourceLabel(index: number, value: string): void {
    setResources((prev) => prev.map((r, i) => (i === index ? { ...r, label: value } : r)));
  }

  function removeResource(index: number): void {
    setResources((prev) => prev.filter((_, i) => i !== index));
    setResourceUploading((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleResourceFileChange(index: number, event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setResourceUploading((prev) => prev.map((v, i) => (i === index ? true : v)));
    setError(null);
    try {
      const url = await uploadToBunny(file, 'videos/resources');
      setResources((prev) => prev.map((r, i) => (i === index ? { ...r, url } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resource zip.');
    } finally {
      setResourceUploading((prev) => prev.map((v, i) => (i === index ? false : v)));
    }
  }

  async function persist(nextStatus?: 'draft' | 'published'): Promise<string | null> {
    setSaving(true);
    setError(null);
    const cleanResources = resources.filter((r) => r.label.trim() && r.url.trim());
    try {
      if (!isEditing) {
        const { error: createError, video: created } = await createVideo({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          videoUrl,
          thumbnailUrl,
          transcript: transcript.trim() || null,
          resources: cleanResources,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create video.');
          return null;
        }
        if (nextStatus === 'published') {
          const { error: statusError } = await setVideoStatus(created.id, 'published');
          if (statusError) {
            setError(statusError);
            return null;
          }
        }
        return created.id;
      }

      const { error: updateError } = await updateVideo(video!.id, {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        videoUrl,
        thumbnailUrl,
        transcript: transcript.trim() || null,
        resources: cleanResources,
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (nextStatus && nextStatus !== video!.status) {
        const { error: statusError } = await setVideoStatus(video!.id, nextStatus);
        if (statusError) {
          setError(statusError);
          return null;
        }
      }
      return video!.id;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft(): Promise<void> {
    const id = await persist('draft');
    if (id) {
      showToast('Video saved as draft.', 'warning');
      onSaved();
    }
  }

  async function handlePublishToggle(): Promise<void> {
    const nextStatus = video?.status === 'published' ? 'draft' : 'published';
    const id = await persist(nextStatus);
    if (id) {
      showToast(nextStatus === 'published' ? 'Video published.' : 'Video saved as draft.', nextStatus === 'published' ? 'success' : 'warning');
      onSaved();
    }
  }

  async function handleRepublish(): Promise<void> {
    const wasPublished = video?.status === 'published';
    const id = await persist('published');
    if (id) {
      showToast(wasPublished ? 'Video republished.' : 'Video published.', 'success');
      onSaved();
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back to videos
          </button>
        )}
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {isEditing ? (
          <button type="button" className={styles.publishBtn} onClick={handleRepublish} disabled={!canSave}>
            {video!.status === 'published' ? 'Republish' : 'Publish'}
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
      {!videoUrl && <p className={styles.fieldHint}>No video file uploaded yet — this video will not appear on Browse Videos until one is uploaded.</p>}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className={styles.formGroup} style={{ flex: '1 1 220px' }}>
          <label className={styles.fieldLabel} htmlFor="video-file">
            Video file
          </label>
          <p className={styles.fieldHint}>MP4 only, up to 50 MB.</p>
          <input
            id="video-file"
            ref={videoInputRef}
            type="file"
            accept="video/mp4"
            className={styles.fileInput}
            onChange={handleVideoFileChange}
            disabled={saving || videoUploading}
          />
          {videoUploading && <p className={styles.uploadStatus}>Uploading…</p>}
          {videoUrl && !videoUploading && (
            <video src={videoUrl} controls className={styles.coverPreview} style={{ maxWidth: '100%', marginTop: '0.75rem' }} />
          )}
        </div>

        <div className={styles.formGroup} style={{ flex: '1 1 220px' }}>
          <label className={styles.fieldLabel} htmlFor="video-thumbnail">
            Thumbnail image
          </label>
          <input
            id="video-thumbnail"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.fileInput}
            onChange={handleThumbnailChange}
            disabled={saving || thumbnailUploading}
          />
          {thumbnailUploading && <p className={styles.uploadStatus}>Uploading…</p>}
          {thumbnailUrl && <img src={thumbnailUrl} alt="Thumbnail preview" className={styles.coverPreview} />}
        </div>

        <div className={styles.formGroup} style={{ flex: '1 1 260px' }}>
          <label className={styles.fieldLabel}>Resources</label>
          <p className={styles.fieldHint}>Zip packages only, up to 10 MB.</p>
          {resources.map((res, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Label"
                value={res.label}
                onChange={(e) => updateResourceLabel(i, e.target.value)}
                disabled={saving}
              />
              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className={styles.fileInput}
                onChange={(e) => handleResourceFileChange(i, e)}
                disabled={saving || resourceUploading[i]}
              />
              {resourceUploading[i] && <span className={styles.uploadStatus}>Uploading…</span>}
              {res.url && !resourceUploading[i] && <span className={styles.uploadStatus}>Uploaded ✓</span>}
              <button type="button" className={styles.cancelBtn} onClick={() => removeResource(i)} disabled={saving}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={styles.addResourceBtn} onClick={addResource} disabled={saving}>
            <ZipIcon />
            Add resource
          </button>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="video-title">
          Title<span className={styles.requiredMark}>*</span>
        </label>
        <textarea
          id="video-title"
          className={`${styles.textInput} ${styles.nameArea}`}
          rows={2}
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Video title"
          disabled={saving}
        />
        {isEditing && (
          <p className={styles.slugPreview}>
            Video URL: <q className={styles.slugValue}>/videos/{video!.slug}</q>
          </p>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="video-description">
          Description
        </label>
        <textarea
          id="video-description"
          className={styles.textArea}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown on Browse Videos"
          disabled={saving}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="video-category">
          Category
        </label>
        <input
          id="video-category"
          type="text"
          className={styles.textInput}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Interviews, Product Demos"
          disabled={saving}
        />
        <p className={styles.fieldHint}>Videos are grouped by this on Browse Videos.</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor="video-transcript">
          Transcript
        </label>
        <textarea
          id="video-transcript"
          className={styles.textArea}
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste or write the full transcript"
          disabled={saving}
        />
      </div>
    </div>
  );
}
