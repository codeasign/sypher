'use client';

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { CourseModule } from '@/data/courses';

// Same defensive patch as CohortEditor/BlogPostEditor: @mdxeditor/editor ->
// @lexical/code statically imports Prism language files that can execute
// out of source order inside a bundler's lazily-loaded chunk, and a
// dependent language extending a not-yet-registered base throws. Tolerate a
// missing base instead of crashing the whole chunk.
const Prism = require('prismjs');
const originalExtend = Prism.languages.extend;
Prism.languages.extend = function patchedExtend(id: string, redef: object) {
  if (!Prism.languages[id]) {
    Prism.languages[id] = {};
  }
  return originalExtend.call(Prism.languages, id, redef);
};

interface ModuleEditorProps {
  courseId: string;
  module?: CourseModule | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

function ModuleEditorLoader(props: ModuleEditorProps): React.JSX.Element {
  const [Inner, setInner] = useState<ComponentType<ModuleEditorProps> | null>(null);

  useEffect(() => {
    import('./ModuleEditorInner').then((mod) => setInner(() => mod.default));
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}

export default function ModuleEditor(props: ModuleEditorProps): React.JSX.Element {
  return <ModuleEditorLoader {...props} />;
}
