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
// BlogPostEditor/CourseEditor/ModuleEditor/JobDescriptionEditor -- same
// @mdxeditor/editor bundling issue, applies per-entrypoint.
const Prism = require('prismjs');
const originalExtend = Prism.languages.extend;
Prism.languages.extend = function patchedExtend(id: string, redef: object) {
  if (!Prism.languages[id]) {
    Prism.languages[id] = {};
  }
  return originalExtend.call(Prism.languages, id, redef);
};

interface Cohort {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  cover_image_url: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  seats_total: number | null;
  price_label: string | null;
  status: 'draft' | 'live' | 'closed';
}

interface CohortEditorProps {
  cohort?: Cohort | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

function CohortEditorLoader(props: CohortEditorProps): React.JSX.Element {
  const [Inner, setInner] = useState<ComponentType<CohortEditorProps> | null>(null);

  useEffect(() => {
    import('./CohortEditorInner').then((mod) => setInner(() => mod.default));
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}

export default function CohortEditor(props: CohortEditorProps): React.JSX.Element {
  return <CohortEditorLoader {...props} />;
}
