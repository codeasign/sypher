import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
// @mdxeditor/editor -> @lexical/code statically imports a fixed set of
// prism-*.js language files, some of which extend a base language that must
// already be registered (e.g. objectivec/cpp extend c, which extends
// clike). Under Rspack, that whole import chain gets bundled into a
// dynamically-loaded vendor chunk whose *internal* module execution order
// isn't guaranteed to match source order, so a dependent language's module
// can run before its base language's module and Prism.languages.extend()
// throws "Cannot set properties of undefined" on the missing base — which
// aborts the entire chunk's evaluation and leaves BlogPostEditorInner's
// dynamic import() promise permanently unresolved.
//
// Rather than fight Rspack's chunk ordering, make Prism.languages.extend()
// tolerate a not-yet-registered base language (falling back to an empty
// object, same as Prism.util.clone(undefined) would if it didn't throw).
// This runs in the eagerly-loaded bundle, before the dynamic import() can
// fire, so the patch is guaranteed to be in place first.
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
  cover_image_url: string | null;
  status: 'draft' | 'published';
}

interface BlogPostEditorProps {
  post?: BlogPost | null;
  onSaved: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

function BlogPostEditorLoader(props: BlogPostEditorProps): JSX.Element {
  const [Inner, setInner] = useState<ComponentType<BlogPostEditorProps> | null>(null);

  useEffect(() => {
    import('./BlogPostEditorInner').then((mod) => setInner(() => mod.default));
  }, []);

  if (!Inner) {
    return <p role="status">Loading editor…</p>;
  }

  return <Inner {...props} />;
}

export default function BlogPostEditor(props: BlogPostEditorProps): JSX.Element {
  return (
    <BrowserOnly fallback={<p role="status">Loading editor…</p>}>
      {() => <BlogPostEditorLoader {...props} />}
    </BrowserOnly>
  );
}
