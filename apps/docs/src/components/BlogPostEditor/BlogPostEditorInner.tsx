import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useColorMode } from '@docusaurus/theme-common';
import BlogPostArticle from '@site/src/components/BlogPostPage/BlogPostArticle';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  markdownShortcutPlugin,
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
import { useAuth } from '@site/src/contexts/AuthContext';
import { createBlogPost, updateBlogPost, setBlogPostStatus } from '@site/src/data/blogPosts';
import { uploadToBunny } from '@site/src/data/bunnyUpload';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 120;

function EyeIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  cover_image_url: string | null;
  status: 'draft' | 'published';
}

interface BlogPostEditorProps {
  post?: BlogPost | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function BlogPostEditorInner({ post, onSaved, onCancel, onBack }: BlogPostEditorProps): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { colorMode } = useColorMode();
  const { supabase, user } = useAuth();
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(post?.cover_image_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState(post?.content ?? '');
  const [contentMarkdown, setContentMarkdown] = useState(post?.content ?? '');
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const editorRef = useRef<MDXEditorMethods>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      const url = await uploadToBunny(file, 'blog/covers', siteConfig.customFields);
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    return uploadToBunny(file, 'blog/content', siteConfig.customFields);
  }

  async function persist(nextStatus?: 'draft' | 'published'): Promise<string | null> {
    setSaving(true);
    setError(null);
    const content = editorRef.current?.getMarkdown() ?? contentMarkdown;

    try {
      if (!isEditing) {
        const { error: createError, post: created } = await createBlogPost(supabase, {
          title: title.trim(),
          description: description.trim(),
          content,
          coverImageUrl,
          authorId: user?.id ?? null,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create post.');
          return null;
        }
        if (nextStatus === 'published') {
          const { error: statusError } = await setBlogPostStatus(supabase, created.id, 'published');
          if (statusError) {
            setError(statusError);
            return null;
          }
        }
        return created.id;
      }

      const { error: updateError } = await updateBlogPost(supabase, post!.id, {
        title: title.trim(),
        description: description.trim(),
        content,
        cover_image_url: coverImageUrl,
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (nextStatus && nextStatus !== post!.status) {
        const { error: statusError } = await setBlogPostStatus(supabase, post!.id, nextStatus);
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
        <BlogPostArticle title={title || 'Untitled post'} content={draftMarkdown} coverImageUrl={coverImageUrl} date={null} />
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
                rows={2}
                disabled={saving}
              />
              <div className={styles.fieldMetaRow}>
                <span className={styles.fieldHint}>Shown on the blog listing page</span>
                <span className={styles.charCount}>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>

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
