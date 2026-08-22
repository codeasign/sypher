'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { useColorMode } from '@/hooks/useColorMode';
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
import { useAuth } from '@/contexts/AuthContext';
import { createCourseModule, updateCourseModule, setModuleGettingStarted } from '@/data/courses';
import { uploadToBunny } from '@/data/bunnyUpload';
import { trackEvent } from '@/lib/analytics';
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

interface CourseModule {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  body_mdx: string;
  show_in_getting_started: boolean;
}

interface ModuleEditorProps {
  courseId: string;
  courseSlug: string;
  module?: CourseModule | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

export default function ModuleEditorInner({
  courseId,
  courseSlug,
  module: mod,
  onSaved,
  onCancel,
  onBack,
}: ModuleEditorProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const { supabase } = useAuth();
  const [title, setTitle] = useState(mod?.title ?? '');
  const [showInGettingStarted, setShowInGettingStarted] = useState(mod?.show_in_getting_started ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState(mod?.body_mdx ?? '');
  const [contentMarkdown, setContentMarkdown] = useState(mod?.body_mdx ?? '');
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const editorRef = useRef<MDXEditorMethods>(null);

  const isEditing = Boolean(mod);
  const canSave = title.trim().length > 0 && contentMarkdown.trim().length > 0 && !saving;

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
    return uploadToBunny(file, `courses/${courseSlug}/modules`, BUNNY_CONFIG);
  }

  async function persist(): Promise<string | null> {
    setSaving(true);
    setError(null);
    const bodyMdx = editorRef.current?.getMarkdown() ?? contentMarkdown;

    try {
      if (!isEditing) {
        const { error: createError, module: created } = await createCourseModule(supabase, courseId, {
          title: title.trim(),
          bodyMdx,
        });
        if (createError || !created) {
          setError(createError ?? 'Failed to create module.');
          return null;
        }
        if (showInGettingStarted) {
          const { error: gsError } = await setModuleGettingStarted(supabase, created.id, { show: true, order: undefined });
          if (gsError) {
            setError(gsError);
            return null;
          }
        }
        return created.id;
      }

      const { error: updateError } = await updateCourseModule(supabase, mod!.id, {
        title: title.trim(),
        body_mdx: bodyMdx,
      });
      if (updateError) {
        setError(updateError);
        return null;
      }
      if (showInGettingStarted !== (mod!.show_in_getting_started ?? false)) {
        const { error: gsError } = await setModuleGettingStarted(supabase, mod!.id, {
          show: showInGettingStarted,
          order: undefined,
        });
        if (gsError) {
          setError(gsError);
          return null;
        }
      }
      return mod!.id;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(): Promise<void> {
    trackEvent('managecourses_module_save_click', { course_id: courseId });
    const id = await persist();
    if (id) onSaved();
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back to modules
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
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={!canSave}>
          Save
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {previewMode ? (
        <CourseModuleArticle
          courseSlug={courseSlug}
          moduleSlug={mod?.slug ?? 'preview'}
          title={title || 'Untitled module'}
          content={draftMarkdown}
          trackView={false}
        />
      ) : (
        <>
          <div className={clsx(styles.card, styles.metaCard)}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="module-title">
                Title<span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="module-title"
                type="text"
                className={styles.titleInput}
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
              <p className={styles.fieldHint}>
                Makes this module publicly visible on /getting-started, regardless of course access.
              </p>
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
                  // Round-tripping real docs content (AsciiDiagram, YouTube,
                  // PdfEmbed, Slideshow tags; frontmatter delimiters; `---`
                  // dividers) previously threw UnrecognizedMarkdownConstructError
                  // on load — none of those constructs had a registered import
                  // visitor. The wildcard descriptor preserves any unrecognized
                  // JSX tag as-is (editable as raw props, not a custom UI) rather
                  // than crashing; content-specific visual editors can replace it
                  // per-tag later if that's ever needed.
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
