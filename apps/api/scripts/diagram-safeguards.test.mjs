// Regression tests for the imported-diagram safeguards.
//
// Run from apps/api:  node --test scripts/diagram-safeguards.test.mjs
//
// Covers: the SVG blackboard normalizer (nested edge-label paragraph, content
// hashing, idempotence, rejection of malformed SVGs), the figure/figcaption
// contract enforced on the API, the figure renderer's escaping and optional
// caption, and the apps/web reader sanitizer allowlist / adjacency behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const require = createRequire(import.meta.url);
require('./register-typescript.cjs');
const { assertImportedDiagramCaptions, renderDiagramFigure, diagramCaption } = require('../src/lib/diagramMarkup.ts');
const { readableBlackboardSvg, diagramSvgFilename } = require('../src/lib/diagramSvg.ts');
const { courseMarkdownSchema } = await import('../../web/src/components/CourseModulePage/markdownSchema.mjs');

const CDN = 'https://syhpher-next-datastore-gvaf.b-cdn.net';

// A minimal Mermaid-style SVG whose edge label carries the exact nested
// <p background-color: rgba(232,232,232,0.8)> that produced the grey box.
function grayLabelSvg(rootId = 'mermaid-1') {
  return [
    `<svg id="${rootId}" xmlns="http://www.w3.org/2000/svg">`,
    `<style data-sypher-theme="blackboard-v3">#${rootId}{background:#0B0F14}</style>`,
    `<g class="edgeLabels"><g class="edgeLabel"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><span class="edgeLabel"><p style="background-color: rgba(232, 232, 232, 0.8);">shape</p></span></div></foreignObject></g></g>`,
    `</svg>`,
  ].join('\n');
}

test('readableBlackboardSvg overrides the nested edge-label paragraph background', () => {
  const out = readableBlackboardSvg(Buffer.from(grayLabelSvg('mermaid-x'))).toString('utf8');
  // The wildcard descendant selector is what reaches the nested <p>.
  assert.match(out, /#mermaid-x \.edgeLabel,#mermaid-x \.edgeLabel \*\{background:#0B0F14!important;background-color:#0B0F14!important;\}/);
  assert.match(out, /data-sypher-theme="blackboard-v4"/);
  // The prior theme block is removed, not stacked.
  assert.equal(out.match(/data-sypher-theme=/g).length, 1);
  assert.ok(!out.includes('blackboard-v3'));
});

test('readableBlackboardSvg is idempotent on repeated normalisation', () => {
  const once = readableBlackboardSvg(Buffer.from(grayLabelSvg()));
  const twice = readableBlackboardSvg(once);
  assert.equal(once.toString('utf8'), twice.toString('utf8'));
});

test('diagramSvgFilename is content-addressed and strips a prior v4 stem', () => {
  const a = readableBlackboardSvg(Buffer.from(grayLabelSvg('a')));
  const name1 = diagramSvgFilename('dd259cce813b.svg', a);
  assert.match(name1, /^dd259cce813b\.blackboard-v4-[a-f0-9]{12}\.svg$/);
  // Re-deriving from the already-suffixed name yields the same file (no stacking).
  const name2 = diagramSvgFilename(name1, a);
  assert.equal(name1, name2);
  // Different bytes -> different digest.
  const b = readableBlackboardSvg(Buffer.from(grayLabelSvg('a').replace('shape', 'shape-2')));
  assert.notEqual(diagramSvgFilename('dd259cce813b.svg', b), name1);
});

test('readableBlackboardSvg rejects a malformed SVG', () => {
  assert.throws(() => readableBlackboardSvg(Buffer.from('<svg><g/></svg>')), /valid root id/);
  assert.throws(() => readableBlackboardSvg(Buffer.from('<svg id="ok"><g/>')), /closing svg tag/);
});

test('assertImportedDiagramCaptions requires a figure wrapper for /svgs/ images', () => {
  assert.throws(
    () => assertImportedDiagramCaptions(`text\n\n<img src="${CDN}/svgs/c/m/abc.svg" alt="x" />\n\nmore`),
    /wrapped in a <figure>/,
  );
});

test('assertImportedDiagramCaptions accepts a figure with one non-empty figcaption', () => {
  assert.doesNotThrow(() =>
    assertImportedDiagramCaptions(`<figure><img src="${CDN}/svgs/c/m/abc.svg" alt="x" /><figcaption>A real caption</figcaption></figure>`),
  );
});

test('assertImportedDiagramCaptions accepts an image-only figure (caption optional)', () => {
  assert.doesNotThrow(() =>
    assertImportedDiagramCaptions(`<figure><img src="${CDN}/svgs/c/m/abc.svg" alt="only alt text" /></figure>`),
  );
});

test('assertImportedDiagramCaptions rejects an empty or duplicated figcaption', () => {
  assert.throws(
    () => assertImportedDiagramCaptions(`<figure><img src="${CDN}/svgs/c/m/abc.svg" alt="x" /><figcaption>   </figcaption></figure>`),
    /must not be empty/,
  );
  assert.throws(
    () => assertImportedDiagramCaptions(`<figure><img src="${CDN}/svgs/c/m/abc.svg" alt="x" /><figcaption>one</figcaption><figcaption>two</figcaption></figure>`),
    /multiple <figcaption>/,
  );
});

test('assertImportedDiagramCaptions ignores non-svg images and fenced code samples', () => {
  assert.doesNotThrow(() => assertImportedDiagramCaptions('<img src="https://example.com/photo.png" alt="not a diagram" />'));
  assert.doesNotThrow(() =>
    assertImportedDiagramCaptions('Example markup:\n\n```html\n<img src="/svgs/c/m/abc.svg" alt="x" />\n```\n'),
  );
});

test('renderDiagramFigure escapes text and treats the caption as optional', () => {
  const withCaption = renderDiagramFigure(`${CDN}/svgs/c/m/a&b.svg`, 'A <role> &amp; more', 'Caption with <b> & "quotes"');
  assert.equal(
    withCaption,
    `<figure><img src="${CDN}/svgs/c/m/a&amp;b.svg" alt="A &lt;role&gt; &amp; more" /><figcaption>Caption with &lt;b&gt; &amp; &quot;quotes&quot;</figcaption></figure>`,
  );
  const noCaption = renderDiagramFigure(`${CDN}/svgs/c/m/x.svg`, 'alt only', '   ');
  assert.equal(noCaption, `<figure><img src="${CDN}/svgs/c/m/x.svg" alt="alt only" /></figure>`);
  // Output survives its own validator.
  assert.doesNotThrow(() => assertImportedDiagramCaptions(withCaption));
  assert.doesNotThrow(() => assertImportedDiagramCaptions(noCaption));
});

test('diagramCaption prefers caption, then title, and never falls back to alt', () => {
  assert.equal(diagramCaption('Cap', 'Title'), 'Cap');
  assert.equal(diagramCaption('  ', 'Title'), 'Title');
  assert.equal(diagramCaption(null, null), undefined);
  assert.equal(diagramCaption('', '   '), undefined);
});

// --- apps/web reader pipeline ---------------------------------------------

function toHast(markdown) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, courseMarkdownSchema);
  return processor.runSync(processor.parse(markdown));
}

function find(node, tagName, acc = []) {
  if (node.type === 'element' && node.tagName === tagName) acc.push(node);
  for (const child of node.children ?? []) find(child, tagName, acc);
  return acc;
}

test('reader sanitizer keeps <figure> and <figcaption> from raw HTML', () => {
  const tree = toHast(`<figure><img src="${CDN}/svgs/c/m/abc.svg" alt="x" /><figcaption>Kept caption</figcaption></figure>`);
  const figures = find(tree, 'figure');
  const figcaptions = find(tree, 'figcaption');
  assert.equal(figures.length, 1);
  assert.equal(figcaptions.length, 1);
  assert.equal(figcaptions[0].children[0].value, 'Kept caption');
});

test('reader sanitizer still strips a disallowed tag (script)', () => {
  const tree = toHast('<figure><figcaption>ok</figcaption></figure><script>alert(1)</script>');
  assert.equal(find(tree, 'script').length, 0);
});

test('a plain paragraph after a bare image is not wrapped as a caption', () => {
  const tree = toHast(`<img src="${CDN}/svgs/c/m/abc.svg" alt="x" />\n\nThat is genuinely most of what you need.`);
  // No figure / figcaption is synthesised; the prose stays an ordinary <p>.
  assert.equal(find(tree, 'figure').length, 0);
  assert.equal(find(tree, 'figcaption').length, 0);
  const paras = find(tree, 'p').filter(p => p.children.some(c => c.type === 'text' && c.value.includes('genuinely most')));
  assert.equal(paras.length, 1);
});
