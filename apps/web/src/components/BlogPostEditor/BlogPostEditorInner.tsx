'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import BlogPostArticle from '@/components/BlogPostPage/BlogPostArticle';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  markdownShortcutPlugin,
  jsxPlugin,
  frontmatterPlugin,
  thematicBreakPlugin,
  GenericJsxEditor,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertCodeBlock,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import { PdfIcon, VideoIcon, NoMediaIcon } from '@/components/icons/ActionIcons';
import { useColorMode } from '@/hooks/useColorMode';
import { extractYouTubeId } from '@/lib/youtube';
import { apiFetch } from '@/lib/api';
import { uploadToBunny } from '@/data/bunnyUpload';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 250;

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

type FeaturedMediaType = 'pdf' | 'youtube';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  featuredMediaType: FeaturedMediaType | null;
  featuredMediaValue: string | null;
  status: 'draft' | 'published';
}

interface BlogPostEditorProps {
  post?: BlogPost | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function BlogPostEditorInner({ post, onSaved, onCancel, onBack }: BlogPostEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(post?.coverImageUrl ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [featuredMediaType, setFeaturedMediaType] = useState<FeaturedMediaType | null>(post?.featuredMediaType ?? null);
  const [featuredMediaValue, setFeaturedMediaValue] = useState<string | null>(post?.featuredMediaValue ?? null);
  const [featuredMediaUploading, setFeaturedMediaUploading] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState(
    post?.featuredMediaType === 'youtube' ? (post.featuredMediaValue ?? '') : ''
  );
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState(post?.content ?? '');
  const [contentMarkdown, setContentMarkdown] = useState(post?.content ?? '');
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const editorRef = useRef<MDXEditorMethods>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { colorMode } = useColorMode();

  const isEditing = Boolean(post);
  const canSave =
    title.trim().length > 0 && description.trim().length > 0 && contentMarkdown.trim().length > 0 && !saving;

  function togglePreview(): void {
    if (!previewMode) {
      const markdown = editorRef.current?.getMarkdown() ?? draftMarkdown;
      setDraftMarkdown(markdown);
      setContentMarkdown(markdown);
      setPreviewMode(true);
    } else {
      setEditorInstanceKey((key) => key + 1);
      setPreviewMode(false);
    }
  }

  async function handleCoverImageChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'blog/covers');
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    return uploadToBunny(file, 'blog/content');
  }

  function selectFeaturedMediaType(type: FeaturedMediaType | null): void {
    setFeaturedMediaType(type);
    setFeaturedMediaValue(null);
    setYoutubeInput('');
    setYoutubeError(null);
  }

  async function handleFeaturedMediaPdfChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Featured PDF must be a PDF file.');
      return;
    }
    setFeaturedMediaUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'blog/featured-media');
      setFeaturedMediaValue(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF.');
    } finally {
      setFeaturedMediaUploading(false);
    }
  }

  function handleYoutubeInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    setYoutubeInput(value);
    if (!value.trim()) {
      setFeaturedMediaValue(null);
      setYoutubeError(null);
      return;
    }
    const id = extractYouTubeId(value);
    if (id) {
      setFeaturedMediaValue(id);
      setYoutubeError(null);
    } else {
      setFeaturedMediaValue(null);
      setYoutubeError('Doesn’t look like a YouTube URL or video ID.');
    }
  }

  async function persist(nextStatus?: 'draft' | 'published'): Promise<string | null> {
    setSaving(true);
    setError(null);
    const content = editorRef.current?.getMarkdown() ?? contentMarkdown;
    const effectiveFeaturedMediaType = featuredMediaValue ? featuredMediaType : null;

    try {
      if (!isEditing) {
        const res = await apiFetch('/blog', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            content,
            coverImageUrl,
            featuredMediaType: effectiveFeaturedMediaType,
            featuredMediaValue,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message ?? 'Failed to create post.');
          return null;
        }
        const created = await res.json();
        if (nextStatus === 'published') {
          const statusRes = await apiFetch(`/blog/${created.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'published' }),
          });
          if (!statusRes.ok) {
            const body = await statusRes.json().catch(() => ({}));
            setError(body.message ?? 'Failed to publish post.');
            return null;
          }
        }
        await apiFetch('/blog/revalidate', { method: 'POST' }).catch(() => {});
        return created.id;
      }

      const updateRes = await apiFetch(`/blog/${post!.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          content,
          coverImageUrl,
          featuredMediaType: effectiveFeaturedMediaType,
          featuredMediaValue,
        }),
      });
      if (!updateRes.ok) {
        const body = await updateRes.json().catch(() => ({}));
        setError(body.message ?? 'Failed to update post.');
        return null;
      }
      if (nextStatus && nextStatus !== post!.status) {
        const statusRes = await apiFetch(`/blog/${post!.id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!statusRes.ok) {
          const body = await statusRes.json().catch(() => ({}));
          setError(body.message ?? 'Failed to update post status.');
          return null;
        }
      }
      await apiFetch('/blog/revalidate', { method: 'POST' }).catch(() => {});
      return post!.id;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft(): Promise<void> {
    const id = await persist('draft');
    if (id) onSaved();
  }

  async function handlePublishToggle(): Promise<void> {
    const nextStatus = post?.status === 'published' ? 'draft' : 'published';
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
            ← Back to posts
          </button>
        )}
        <div className={styles.toolbarSpacer} />
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

      {previewMode ? (
        <BlogPostArticle
          slug={post?.slug ?? 'preview'}
          title={title || 'Untitled post'}
          content={draftMarkdown}
          coverImageUrl={coverImageUrl}
          featuredMediaType={featuredMediaValue ? featuredMediaType : null}
          featuredMediaValue={featuredMediaValue}
          date={null}
          showBackLink={false}
        />
      ) : (
        <>
          <div className={clsx(styles.card, styles.metaCard)}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="blog-post-title">
                Title<span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="blog-post-title"
                type="text"
                className={styles.titleInput}
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                disabled={saving}
              />
              <div className={styles.fieldMetaRow}>
                <span className={styles.fieldHint}>Short, descriptive title</span>
                <span className={styles.charCount}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="blog-post-description">
                Description<span className={styles.requiredMark}>*</span>
              </label>
              <textarea
                id="blog-post-description"
                className={styles.descriptionInput}
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary shown on the blog listing"
                rows={3}
                disabled={saving}
              />
              <div className={styles.fieldMetaRow}>
                <span className={styles.fieldHint}>Shown on the blog listing page</span>
                <span className={styles.charCount}>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>

            <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="blog-post-cover">
                Cover image
              </label>
              <div className={styles.coverField}>
                {coverImageUrl && <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />}
                <label htmlFor="blog-post-cover" className={styles.coverUploadLabel}>
                  {coverImageUrl ? 'Replace image' : 'Upload image'}
                </label>
                <input
                  id="blog-post-cover"
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

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>Featured media</label>
              <div className={styles.mediaTypeRow}>
                <button
                  type="button"
                  className={clsx(styles.mediaTypeBtn, featuredMediaType === null && styles.mediaTypeBtnActive)}
                  onClick={() => selectFeaturedMediaType(null)}
                  disabled={saving}
                >
                  <NoMediaIcon />
                  None
                </button>
                <button
                  type="button"
                  className={clsx(styles.mediaTypeBtn, featuredMediaType === 'pdf' && styles.mediaTypeBtnActive)}
                  onClick={() => selectFeaturedMediaType('pdf')}
                  disabled={saving}
                >
                  <PdfIcon />
                  PDF
                </button>
                <button
                  type="button"
                  className={clsx(styles.mediaTypeBtn, featuredMediaType === 'youtube' && styles.mediaTypeBtnActive)}
                  onClick={() => selectFeaturedMediaType('youtube')}
                  disabled={saving}
                >
                  <VideoIcon />
                  YouTube
                </button>
              </div>

              {featuredMediaType === 'pdf' && (
                <div className={styles.coverField}>
                  {featuredMediaValue && (
                    <a href={featuredMediaValue} target="_blank" rel="noopener noreferrer" className={styles.fieldHint}>
                      {featuredMediaValue.split('/').pop()}
                    </a>
                  )}
                  <label htmlFor="blog-post-featured-pdf" className={styles.coverUploadLabel}>
                    {featuredMediaValue ? 'Replace PDF' : 'Upload PDF'}
                  </label>
                  <input
                    id="blog-post-featured-pdf"
                    type="file"
                    accept="application/pdf"
                    className={styles.fileInput}
                    onChange={handleFeaturedMediaPdfChange}
                    disabled={saving || featuredMediaUploading}
                  />
                  {featuredMediaUploading && <span className={styles.uploadingNote}>Uploading…</span>}
                </div>
              )}

              {featuredMediaType === 'youtube' && (
                <div className={styles.coverField}>
                  <input
                    type="text"
                    className={styles.titleInput}
                    value={youtubeInput}
                    onChange={handleYoutubeInputChange}
                    placeholder="Paste a YouTube URL"
                    disabled={saving}
                  />
                  {youtubeError && <span className={styles.inlineError}>{youtubeError}</span>}
                </div>
              )}
            </div>
            </div>
          </div>

          <div className={clsx(styles.card, styles.contentCard)}>
            <label className={styles.fieldLabel}>
              Content<span className={styles.requiredMark}>*</span>
            </label>
            <div className={styles.mdxWrapper}>
              <MDXEditor
                key={editorInstanceKey}
                ref={editorRef}
                className={colorMode === 'dark' ? 'dark-theme' : undefined}
                contentEditableClassName={styles.mdxContentEditable}
                markdown={draftMarkdown}
                onChange={(markdown) => setContentMarkdown(markdown)}
                onError={({ error: mdxError }) => setError(mdxError)}
                plugins={[
                  headingsPlugin(),
                  listsPlugin(),
                  quotePlugin(),
                  linkPlugin(),
                  linkDialogPlugin(),
                  imagePlugin({ imageUploadHandler: handleImageUpload }),
                  codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
                  codeMirrorPlugin({
                    codeBlockLanguages: {
                      text: 'Plain text',
                      js: 'JavaScript',
                      jsx: 'JSX',
                      ts: 'TypeScript',
                      tsx: 'TSX',
                      python: 'Python',
                      bash: 'Bash',
                      json: 'JSON',
                      css: 'CSS',
                      html: 'HTML',
                      sql: 'SQL',
                      yaml: 'YAML',
                    },
                  }),
                  markdownShortcutPlugin(),
                  hardLineBreakPlugin(),
                  // Same crash fix already applied to
                  // apps/app/src/components/ModuleEditor/ModuleEditorInner.tsx —
                  // round-tripping real content with frontmatter delimiters,
                  // `---` dividers, or any JSX tag previously threw
                  // UnrecognizedMarkdownConstructError on load.
                  jsxPlugin({
                    jsxComponentDescriptors: [
                      { name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor },
                    ],
                  }),
                  frontmatterPlugin(),
                  thematicBreakPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <ConditionalContents
                        options={[
                          { when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> },
                          {
                            fallback: () => (
                              <>
                                <UndoRedo />
                                <BoldItalicUnderlineToggles />
                                <BlockTypeSelect />
                                <ListsToggle />
                                <CreateLink />
                                <InsertImage />
                                <InsertCodeBlock />
                              </>
                            ),
                          },
                        ]}
                      />
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
