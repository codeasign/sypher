'use client';

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { MarkdownEditorProps } from './types';

// Reusable rich-text (markdown) editor with a built-in full screen mode.
// Loaded lazily because @mdxeditor/editor is heavy and browser-only.
//
// Same defensive patch as CohortEditor/BlogPostEditor/ModuleEditor:
// @mdxeditor/editor -> @lexical/code statically imports Prism language files
// that can execute out of source order inside a bundler's lazily-loaded
// chunk, and a dependent language extending a not-yet-registered base
// throws. Tolerate a missing base instead of crashing the whole chunk.
const Prism = require('prismjs');
if (!Prism.languages.__extendPatched) {
  const originalExtend = Prism.languages.extend;
  Prism.languages.extend = function patchedExtend(id: string, redef: object) {
    if (!Prism.languages[id]) {
      Prism.languages[id] = {};
    }
    return originalExtend.call(Prism.languages, id, redef);
  };
  Object.defineProperty(Prism.languages, '__extendPatched', { value: true, enumerable: false });
}

export type { MarkdownEditorProps } from './types';

export default function MarkdownEditor(props: MarkdownEditorProps): React.JSX.Element {
  const [Inner, setInner] = useState<ComponentType<MarkdownEditorProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./MarkdownEditorInner').then((mod) => {
      if (!cancelled) setInner(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}
