'use client';

import { Maximize, Minimize2 } from 'lucide-react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
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
} from '@mdxeditor/editor';
import { hardLineBreakPlugin } from '@/lib/mdxeditor/hardLineBreakPlugin';
import { useColorMode } from '@/hooks/useColorMode';
import type { MarkdownEditorProps } from './types';
import '@mdxeditor/editor/style.css';
import styles from './styles.module.css';

// MDXEditor reads its `plugins` array once at mount, so anything in the
// toolbar must get live state through context, not through a closure over
// component state (that would freeze the button label at its first value).
const FullscreenContext = createContext<{ fullscreen: boolean; toggle: () => void }>({ fullscreen: false, toggle: () => {} });

function FullscreenToggle(): React.JSX.Element {
  const { fullscreen, toggle } = useContext(FullscreenContext);
  return (
    <button type="button" className={styles.fullscreenBtn} onClick={toggle} aria-pressed={fullscreen}>
      {fullscreen ? <Minimize2 size={14} /> : <Maximize size={14} />}
      {fullscreen ? 'Exit full screen' : 'Full screen'}
    </button>
  );
}

export default function MarkdownEditorInner({
  value,
  onChange,
  maxLength,
  placeholder,
  disabled = false,
  minHeight = '10rem',
  labelledBy,
}: MarkdownEditorProps): React.JSX.Element {
  const [fullscreen, setFullscreen] = useState(false);
  const [length, setLength] = useState(value.length);
  const [parseError, setParseError] = useState<string | null>(null);
  const { colorMode } = useColorMode();

  // Escape leaves full screen; the page behind stops scrolling while it is open.
  useEffect(() => {
    if (!fullscreen) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setFullscreen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  const overLimit = maxLength !== undefined && length > maxLength;

  return (
    <div>
      <div
        className={clsx(styles.wrapper, fullscreen && styles.wrapperFullscreen)}
        role={fullscreen ? 'dialog' : 'group'}
        aria-modal={fullscreen ? true : undefined}
        aria-labelledby={labelledBy}
        style={{ '--md-min-height': fullscreen ? 'calc(100vh - 9rem)' : minHeight } as React.CSSProperties}
      >
        <FullscreenContext.Provider value={{ fullscreen, toggle: () => setFullscreen((f) => !f) }}>
          <MDXEditor
            className={colorMode === 'dark' ? 'dark-theme' : undefined}
            contentEditableClassName={styles.content}
            markdown={value}
            readOnly={disabled}
            placeholder={placeholder}
            onChange={(markdown) => {
              setLength(markdown.length);
              setParseError(null);
              onChange(markdown);
            }}
            onError={({ error }) => setParseError(error)}
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              markdownShortcutPlugin(),
              hardLineBreakPlugin(),
              // Crash guards, same as ModuleEditor: existing plain-text content
              // with JSX-looking tags, frontmatter delimiters or `---` lines
              // would otherwise throw UnrecognizedMarkdownConstructError.
              jsxPlugin({
                jsxComponentDescriptors: [{ name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }],
              }),
              frontmatterPlugin(),
              thematicBreakPlugin(),
              toolbarPlugin({
                toolbarContents: () => (
                  <>
                    <UndoRedo />
                    <BoldItalicUnderlineToggles />
                    <BlockTypeSelect />
                    <ListsToggle />
                    <CreateLink />
                    <FullscreenToggle />
                  </>
                ),
              }),
            ]}
          />
        </FullscreenContext.Provider>
      </div>
      {parseError && (
        <p className={styles.error} role="alert">
          The editor could not open some of this content: {parseError}
        </p>
      )}
      {maxLength !== undefined && (
        <span className={clsx(styles.counter, overLimit && styles.counterOver)} aria-live="polite">
          {length}/{maxLength}
        </span>
      )}
    </div>
  );
}
