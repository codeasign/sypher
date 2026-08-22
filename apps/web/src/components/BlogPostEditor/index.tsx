'use client';

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
// Defensive patch carried over from apps/app's identical wrapper (see its
// comment) — @mdxeditor/editor's @lexical/code language-file chunk can hit
// module-execution-order issues under some bundlers when a dependent
// language runs before its base language is registered. apps/web builds
// with Turbopack rather than apps/app's Rspack, so this exact failure mode
// may not reproduce here, but the patch is harmless and cheap insurance —
// kept rather than assuming Turbopack is immune.
const Prism = require('prismjs');
const originalExtend = Prism.languages.extend;
Prism.languages.extend = function patchedExtend(id: string, redef: object) {
  if (!Prism.languages[id]) {
    Prism.languages[id] = {};
  }
  return originalExtend.call(Prism.languages, id, redef);
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  featuredMediaType: 'pdf' | 'youtube' | null;
  featuredMediaValue: string | null;
  status: 'draft' | 'published';
}

interface BlogPostEditorProps {
  post?: BlogPost | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

function BlogPostEditorLoader(props: BlogPostEditorProps): React.JSX.Element {
  const [Inner, setInner] = useState<ComponentType<BlogPostEditorProps> | null>(null);

  useEffect(() => {
    import('./BlogPostEditorInner').then((mod) => setInner(() => mod.default));
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}

export default function BlogPostEditor(props: BlogPostEditorProps): React.JSX.Element {
  return <BlogPostEditorLoader {...props} />;
}
