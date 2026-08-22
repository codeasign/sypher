'use client';

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

// Same defensive patch as apps/app's CohortEditor/BlogPostEditor/
// ModuleEditor loaders: @mdxeditor/editor -> @lexical/code statically
// imports Prism language files that can execute out of source order inside
// a bundler's lazily-loaded chunk, and a dependent language extending a
// not-yet-registered base throws. Tolerate a missing base instead of
// crashing the whole chunk.
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
  coverImageUrl: string | null;
  startDate: string | null;
  durationWeeks: number | null;
  seatsTotal: number | null;
  priceLabel: string | null;
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
