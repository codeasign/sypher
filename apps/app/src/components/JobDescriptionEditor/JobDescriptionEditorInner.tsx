'use client';

import React from 'react';
import { useColorMode } from '@/hooks/useColorMode';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
} from '@mdxeditor/editor';
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

interface JobDescriptionEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function JobDescriptionEditorInner({
  markdown,
  onChange,
  placeholder,
  disabled,
}: JobDescriptionEditorProps): React.JSX.Element {
  const { colorMode } = useColorMode();

  return (
    <div className={styles.mdxWrapper}>
      <MDXEditor
        className={colorMode === 'dark' ? 'dark-theme' : undefined}
        contentEditableClassName={styles.mdxContentEditable}
        markdown={markdown}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={disabled}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          // linkPlugin is kept (without a toolbar control) so that a
          // description saved elsewhere containing markdown link syntax
          // still parses/renders instead of erroring the editor.
          linkPlugin(),
          markdownShortcutPlugin(),
          hardLineBreakPlugin(),
          toolbarPlugin({
            // Image and link insertion are intentionally left out of this
            // toolbar -- job descriptions don't need either.
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <BlockTypeSelect />
                <ListsToggle />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
