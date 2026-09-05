import { Prism } from 'prism-react-renderer';

// prism-react-renderer only bundles a small, "a little arbitrary" default
// language set (its own README's wording) -- java/csharp/bash/go/sql/yaml/
// json are NOT in it, and Highlight silently tokenizes them as one flat
// "plain" run instead of erroring, which is why code blocks in those
// languages rendered with zero color differentiation. Each prismjs
// component file below is a plain `(function (Prism) { ... }(Prism))` IIFE
// that expects a *global* `Prism` to extend -- it must be pointed at
// prism-react-renderer's own internal Prism instance (not the separate
// `prismjs` package's own global, which the Lexical editors use
// separately) before requiring them, in both the SSR and browser globals.
const globalScope = (typeof window !== 'undefined' ? window : global) as unknown as { Prism: typeof Prism };
globalScope.Prism = Prism;

require('prismjs/components/prism-java');
require('prismjs/components/prism-csharp');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-go');
require('prismjs/components/prism-sql');
require('prismjs/components/prism-yaml');
require('prismjs/components/prism-json');
