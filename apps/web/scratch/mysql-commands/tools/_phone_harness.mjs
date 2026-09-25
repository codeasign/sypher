// Offline layout harness (not part of the course): renders every module page through the
// same react-markdown pipeline as CourseModuleArticle and writes static HTML that uses the
// reader's real .body + course-theme CSS, so narrow-viewport layout can be checked in Chrome
// without publishing the (draft) course.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const webRoot = 'D:/jenny/sypher/apps/web';
const require = createRequire(webRoot + '/package.json');
const { default: ReactMarkdown } = await import(pathToFileURL(require.resolve('react-markdown')).href);
const { default: remarkGfm } = await import(pathToFileURL(require.resolve('remark-gfm')).href);
const { default: remarkBreaks } = await import(pathToFileURL(require.resolve('remark-breaks')).href);
const { default: rehypeRaw } = await import(pathToFileURL(require.resolve('rehype-raw')).href);
const { default: rehypeSanitize, defaultSchema } = await import(pathToFileURL(require.resolve('rehype-sanitize')).href);
const schema = { ...defaultSchema, tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'figure', 'figcaption'] };

const pagesDir = webRoot + '/scratch/mysql-commands/pages';
const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });

const css = `
:root{--ifm-color-emphasis-50:#f8f8fa;--ifm-color-emphasis-100:#f1f1f5;--ifm-color-emphasis-200:#e3e3ea;--ifm-color-emphasis-300:#cfcfd8;--ifm-color-emphasis-700:#555;--ifm-font-color-base:#1c1e21;--ifm-background-surface-color:#fff;--ifm-global-radius:6px;--ifm-code-font-size:0.9rem;--ifm-font-family-monospace:Consolas,monospace}
*{box-sizing:border-box} body{margin:0;background:#f4f4f7;font-family:system-ui,sans-serif}
.container{max-width:min(984px,calc(100% - 10rem));margin:0 auto;background:#fff;border:1px solid #e3e3ea;padding:3rem 2.5rem 5rem}
@media (max-width:768px){.container{max-width:min(984px,calc(100% - 6rem))}}
@media (max-width:480px){.container{max-width:100%}}
.article{width:100%}
.title{font-size:2rem;font-weight:700;margin:0 0 1.5rem;overflow-wrap:break-word;word-break:break-word}
.body{font-size:1rem;line-height:1.75;color:var(--ifm-font-color-base);overflow-wrap:break-word;word-break:break-word}
.body table{display:block;max-width:100%;margin:1.5rem 0;overflow-x:auto;border-collapse:collapse}
.body th,.body td{padding:.55rem .9rem;border:1px solid var(--ifm-color-emphasis-200);text-align:left;white-space:nowrap}
.body thead th{background:var(--ifm-color-emphasis-100);font-weight:700}
.body pre{padding:.65rem .85rem;border-radius:6px;overflow-x:auto;margin:0;white-space:pre-wrap;word-break:break-word;background:var(--ifm-color-emphasis-50);font-family:Consolas,monospace;font-size:.85rem;line-height:1.35}
.codeBlockWrapper{position:relative;margin:1rem 0}
.body code{padding:.12rem .35rem;border:1px solid var(--ifm-color-emphasis-300);border-radius:.35rem;background:var(--ifm-color-emphasis-200);font-family:var(--ifm-font-family-monospace);font-size:var(--ifm-code-font-size);line-height:1.5;overflow-wrap:break-word;word-break:break-word}
.body pre code{border:0;background:none;padding:0}
.body ul,.body ol{padding-left:2.5rem}.body p{margin:0 0 1rem}
`;

// Use the real course-theme stylesheet verbatim (class names are plain here, no CSS-module hashing).
const themeCss = fs.readFileSync(webRoot + '/src/components/CourseModulePage/courseThemes/mysql-commands.module.css', 'utf8');

const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.mdx')).sort();
const index = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const m = raw.match(/^---\ntitle: "(.*)"\norder: (\d+)\n---\n/);
  const title = m[1];
  const body = raw.slice(m[0].length);
  const el = React.createElement(
    'article', { className: 'article' },
    React.createElement('h1', { className: 'title' }, title),
    React.createElement('div', { className: 'body theme theme' },
      React.createElement(ReactMarkdown, {
        remarkPlugins: [remarkGfm, remarkBreaks],
        rehypePlugins: [rehypeRaw, [rehypeSanitize, schema]],
        components: { pre: (p) => React.createElement('div', { className: 'codeBlockWrapper' }, React.createElement('pre', null, p.children)) },
      }, body)));
  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${css}${themeCss}</style><div class=container>${renderToStaticMarkup(el)}</div>`;
  const name = f.replace('.mdx', '.html');
  fs.writeFileSync(path.join(outDir, name), html);
  index.push(name);
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
console.log('wrote', index.length);
