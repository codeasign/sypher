'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import CourseModuleArticle from '@/components/CourseModulePage/CourseModuleArticle';
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
import { useColorMode } from '@/hooks/useColorMode';
import { createCourseModule, updateCourseModule, type CourseModule } from '@/data/courses';
import { submitModuleEditRequest } from '@/data/moduleEditRequests';
import { uploadToBunny } from '@/data/bunnyUpload';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast/ToastProvider';
import '@mdxeditor/editor/style.css';
import styles from '../manage-courses.module.css';

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

function ExpandIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function CollapseIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
  );
}

interface ModuleEditorProps {
  courseId: string;
  module?: CourseModule | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export default function ModuleEditorInner({ courseId, module: mod, onSaved, onCancel, onBack }: ModuleEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(mod?.title ?? '');
  const [showInGettingStarted, setShowInGettingStarted] = useState(mod?.showInGettingStarted ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState(mod?.bodyMdx ?? '');
  const [contentMarkdown, setContentMarkdown] = useState(mod?.bodyMdx ?? '');
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // Same content-approval gate as the reader page's inline editor (user
  // request 2026-09-16) — Admins publish content directly, everyone else
  // (Reviewer included) submits a ModuleEditRequest instead. Defaults to
  // false (safest assumption) until /auth/me resolves.
  const [canPublishDirectly, setCanPublishDirectly] = useState(false);
  const editorRef = useRef<MDXEditorMethods>(null);
  const { colorMode } = useColorMode();
  const { showToast } = useToast();

  const isEditing = Boolean(mod);
  const canSave = title.trim().length > 0 && contentMarkdown.trim().length > 0 && !saving;

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { role?: string } | null) => {
        if (!cancelled) setCanPublishDirectly(me?.role === 'ADMIN');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

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

  async function handleImageUpload(file: File): Promise<string> {
    return uploadToBunny(file, `courses/${courseId}/modules`);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    const bodyMdx = editorRef.current?.getMarkdown() ?? contentMarkdown;

    try {
      if (!isEditing) {
        const { error: createError, module: created } = await createCourseModule(courseId, {
          title: title.trim(),
          // Non-admins can still create the module itself (title,
          // settings) — content just can't land directly, so it's
          // submitted as a follow-up edit request below.
          bodyMdx: canPublishDirectly ? bodyMdx : '',
          showInGettingStarted,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create module.');
          return;
        }
        if (!canPublishDirectly && bodyMdx.trim().length > 0) {
          const { error: submitError } = await submitModuleEditRequest(courseId, created.id, bodyMdx);
          if (submitError) {
            setError(submitError);
            return;
          }
          showToast('Module created; content submitted for review.', 'info');
        } else {
          showToast('Module created.', 'success');
        }
      } else {
        const { error: updateError } = await updateCourseModule(courseId, mod!.id, {
          title: title.trim(),
          showInGettingStarted,
          // Omitted entirely (not just emptied) for non-admins — the API
          // rejects a bodyMdx key on this endpoint unless the caller can
          // publish directly.
          ...(canPublishDirectly ? { bodyMdx } : {}),
        });
        if (updateError) {
          setError(updateError);
          return;
        }
        if (!canPublishDirectly) {
          const { error: submitError } = await submitModuleEditRequest(courseId, mod!.id, bodyMdx);
          if (submitError) {
            setError(submitError);
            return;
          }
          showToast('Submitted for review. A Course Auditor will approve it before it goes live.', 'info');
        } else {
          showToast('Module updated.', 'success');
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
            ← Back to modules
          </button>
        )}
        <button type="button" className={clsx(styles.toolbarBtn, previewMode && styles.toolbarBtnActive)} onClick={togglePreview}>
          {previewMode ? <EyeOffIcon /> : <EyeIcon />}
          {previewMode ? 'Edit' : 'Preview'}
        </button>
        {!previewMode && (
          <button type="button" className={styles.toolbarBtn} onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <CollapseIcon /> : <ExpandIcon />}
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        )}
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : canPublishDirectly ? 'Save' : 'Submit for review'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {previewMode ? (
        <CourseModuleArticle title={title || 'Untitled module'} content={draftMarkdown} />
      ) : (
        <>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="module-title">
              Title<span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="module-title"
              type="text"
              className={styles.textInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Module title"
              disabled={saving}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel} htmlFor="module-getting-started">
              <input
                id="module-getting-started"
                type="checkbox"
                checked={showInGettingStarted}
                onChange={(e) => setShowInGettingStarted(e.target.checked)}
                disabled={saving}
              />
              Show in Getting Started Guides
            </label>
            <p className={styles.fieldHint}>Makes this module publicly visible on /getting-started, regardless of course access.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>
              Content<span className={styles.requiredMark}>*</span>
            </label>
            <div className={clsx(styles.mdxWrapper, fullscreen && styles.mdxWrapperFullscreen)}>
              {fullscreen && (
                <button type="button" className={styles.fullscreenExitBtn} onClick={() => setFullscreen(false)} aria-label="Exit full screen">
                  <CollapseIcon />
                </button>
              )}
              <MDXEditor
                key={editorInstanceKey}
                ref={editorRef}
                className={colorMode === 'dark' ? 'dark-theme' : undefined}
                contentEditableClassName={clsx(styles.mdxContentEditable, fullscreen && styles.mdxContentEditableFullscreen)}
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
                  // Same crash fix as apps/app's ModuleEditorInner.tsx: round-tripping
                  // real content with JSX tags, frontmatter delimiters, or `---`
                  // dividers throws UnrecognizedMarkdownConstructError without these.
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
