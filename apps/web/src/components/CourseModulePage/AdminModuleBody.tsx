'use client';

import React from 'react';
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
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import { useColorMode } from '@/hooks/useColorMode';
import { uploadToBunny } from '@/data/bunnyUpload';
import { useAdminModuleEdit } from './AdminModuleEditContext';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

// Article body for admins — swaps between the read-only article and the
// MDXEditor based on AdminModuleEditProvider's shared state; the actual
// Edit/Cancel/Save buttons live in the header (AdminModuleHeaderActions).
export default function AdminModuleBody(): React.JSX.Element {
  const { canEdit, courseId, title, content, editing, error, draftMarkdown, editorInstanceKey, editorRef, setContentMarkdown, setError } = useAdminModuleEdit();
  const { colorMode } = useColorMode();

  if (!canEdit || !editing) {
    return <CourseModuleArticle title={title} content={content} />;
  }

  async function handleImageUpload(file: File): Promise<string> {
    return uploadToBunny(file, `courses/${courseId}/modules`);
  }

  return (
    <div className={styles.adminEditor}>
      {error && <p className={styles.error}>{error}</p>}
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
  );
}
