'use client';

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

// @mdxeditor/editor -> @lexical/code statically imports a fixed set of
// prism-*.js language files, some of which extend a base language that must
// already be registered (e.g. objectivec/cpp extend c, which extends
// clike). Under Rspack, that whole import chain gets bundled into a
// dynamically-loaded vendor chunk whose *internal* module execution order
// isn't guaranteed to match source order, so a dependent language's module
// can run before its base language's module and Prism.languages.extend()
// throws "Cannot set properties of undefined" on the missing base -- which
// aborts the entire chunk's evaluation and leaves this loader's dynamic
// import() promise permanently unresolved.
//
// Rather than fight Rspack's chunk ordering, make Prism.languages.extend()
// tolerate a not-yet-registered base language (falling back to an empty
// object, same as Prism.util.clone(undefined) would if it didn't throw).
// This runs in the eagerly-loaded bundle, before the dynamic import() can
// fire, so the patch is guaranteed to be in place first. Duplicated from
// ModuleEditor/BlogPostEditor -- same @mdxeditor/editor bundling issue,
// applies per-entrypoint even though this instance doesn't use
// codeBlockPlugin/codeMirrorPlugin itself.
const Prism = require('prismjs');
const originalExtend = Prism.languages.extend;
Prism.languages.extend = function patchedExtend(id: string, redef: object) {
  if (!Prism.languages[id]) {
    Prism.languages[id] = {};
  }
  return originalExtend.call(Prism.languages, id, redef);
};

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published';
}

interface CourseEditorProps {
  course?: Course | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

function CourseEditorLoader(props: CourseEditorProps): React.JSX.Element {
  const [Inner, setInner] = useState<ComponentType<CourseEditorProps> | null>(null);

  useEffect(() => {
    import('./CourseEditorInner').then((mod) => setInner(() => mod.default));
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}

export default function CourseEditor(props: CourseEditorProps): React.JSX.Element {
  return <CourseEditorLoader {...props} />;
}
