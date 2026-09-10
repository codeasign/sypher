// Read-only catalog/SVG audit. Prints JSON; does not update courses or assets.
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
// Use the reader's own sanitizer schema so the render-tree checks below match
// what CourseModuleArticle actually produces (it now permits figure/figcaption).
import { courseMarkdownSchema } from '../../web/src/components/CourseModulePage/markdownSchema.mjs';
const renderer = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize, courseMarkdownSchema);
function misleadingCaptionParagraphs(node) {
  let count = 0;
  const elements = (node.children || []).filter(n => n.type === 'element');
  for (let i = 0; i + 1 < elements.length; i++) {
    const next = elements[i + 1];
    if (elements[i].tagName === 'img' && next.tagName === 'p') {
      const children = (next.children || []).filter(n => n.type !== 'text' || n.value.trim());
      if (!(children.length === 1 && children[0].tagName === 'em')) count++;
    }
  }
  for (const child of node.children || []) count += misleadingCaptionParagraphs(child);
  return count;
}
const root = path.resolve('../..');
const base = process.env.IMPORT_API_URL || 'http://localhost:4000';
const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.IMPORT_ADMIN_EMAIL || 'admin@sypher.local', password: process.env.IMPORT_ADMIN_PASSWORD || 'devpassword123' }) });
if (!r.ok) throw Error('Login ' + r.status);
const cookie = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
async function get(p) { const r = await fetch(base + p, { headers: { Cookie: cookie } }); if (!r.ok) throw Error(p + ': ' + r.status); return r.json(); }
const courses = [];
for (let offset = 0; ; offset += 100) { const p = await get('/courses/manage/list?limit=100&offset=' + offset); courses.push(...p.courses); if (courses.length >= p.total) break; }
// Optional: `--course <slug>` (repeatable) restricts the scan for staged verification.
const onlySlugs = process.argv.reduce((acc, a, i) => (process.argv[i - 1] === '--course' ? [...acc, a] : acc), []);
if (onlySlugs.length) { for (let i = courses.length - 1; i >= 0; i--) if (!onlySlugs.includes(courses[i].slug)) courses.splice(i, 1); }
function tags(text) {
  const out = []; let i = 0;
  while ((i = text.indexOf('<AsciiDiagram', i)) >= 0) {
    const start = i; let backtick = false;
    for (; i < text.length; i++) { if (text[i] === '`') backtick = !backtick; if (!backtick && (text.startsWith('/>', i) || text.startsWith('</AsciiDiagram>', i))) { i += text.startsWith('/>', i) ? 2 : 15; out.push(text.slice(start, i)); break; } }
  }
  return out;
}
const attr = (s, key) => s.match(new RegExp('\\b' + key + '="([^"]*)"'))?.[1] ?? null;
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const escape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const result = [];
const urls = new Map();
for (const c of courses) {
  const mods = await get(`/courses/${c.id}/manage/modules`);
  const manifestPath = path.join(root, 'apps/docs/diagram-manifests', c.slug + '.json');
  const byHash = new Map();
  const byAlt = new Map();
  const sourceFiles = new Map();
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const d of manifest.diagrams) {
      if (!sourceFiles.has(d.file)) {
        const file = path.join(root, d.file);
        sourceFiles.set(d.file, fs.existsSync(file) ? tags(fs.readFileSync(file, 'utf8')) : []);
      }
      const tag = sourceFiles.get(d.file).find(t => attr(t, 'id') === d.id);
      if (tag && d.mermaidSrc) {
        const entry = { file: d.file, id: d.id, caption: attr(tag, 'caption'), source: attr(tag, 'mermaidSrc') };
        byHash.set(path.basename(d.mermaidSrc), entry);
        const alt = attr(tag, 'alt');
        if (alt) { const matches = byAlt.get(alt) || []; matches.push(entry); byAlt.set(alt, matches); }
      }
    }
  }
  const images = [];
  let styledProseParagraphs = 0;
  for (const m of mods) {
    if (m.bodyMdx.includes('<img')) styledProseParagraphs += misleadingCaptionParagraphs(await renderer.run(renderer.parse(m.bodyMdx)));
    for (const match of m.bodyMdx.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const url = decode(match[1]);
      if (!/\.svg(?:\?|$)/.test(url)) continue;
      const hash = path.basename(new URL(url).pathname);
      const altMatches = byAlt.get(decode(attr(match[0], 'alt') || '')) || [];
      const source = (altMatches.length === 1 ? altMatches[0] : undefined) || byHash.get(hash);
      const after = m.bodyMdx.slice(match.index + match[0].length, match.index + match[0].length + 1600);
      const before = m.bodyMdx.slice(Math.max(0, match.index - 120), match.index);
      const inFigure = /<figure[^>]*>\s*$/.test(before);
      const figcaption = inFigure ? after.match(/^\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/)?.[1]?.trim() ?? null : null;
      const cap = source?.caption;
      const image = { module: m.slug, url, source: source?.file, sourceHashDiffers: source ? path.basename(source.source) !== hash : null, caption: cap, inFigure, figcaption, captionInBody: cap ? m.bodyMdx.includes(escape(cap)) || m.bodyMdx.includes(cap) : null, captionImmediatelyAfter: cap ? after.trimStart().startsWith('<p><em>' + escape(cap) + '</em></p>') : null, after: after.slice(0, 200), sourceMatched: !!source };
      images.push(image);
      if (!urls.has(url)) urls.set(url, { courses: [], images: [] });
      urls.get(url).courses.push(c.slug);
      urls.get(url).images.push(image);
    }
  }
  result.push({ slug: c.slug, status: c.status, modules: mods.length, images, styledProseParagraphs });
}
const svgResults = [];
const entries = process.argv.includes('--captions-only') ? [] : [...urls];
for (let i = 0; i < entries.length; i += 12) {
  await Promise.all(entries.slice(i, i + 12).map(async ([url, refs]) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) }); const svg = await res.text();
      const styles = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
      const labelRules = styles.match(/[^{}]+\{[^{}]*\}/g)?.filter(rule => /edgeLabel|labelBkg/.test(rule)) ?? [];
      const record = { url, status: res.status, courses: [...new Set(refs.courses)], theme: svg.match(/data-sypher-theme="([^"]+)"/)?.[1] ?? 'none', labelRules, edgeLabelElements: (svg.match(/class="[^"]*edgeLabel[^"]*"/g) ?? []).length, lightLabelRules: labelRules.filter(x => /(?:lightgrey|lightgray|#ddd|#d3d3d3|#ececec|#fff|rgba?\(\s*(?:211|221|236|255))/i.test(x)), title: svg.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? null };
      // blackboard-v3 fixed only ".edgeLabel span"; blackboard-v4 adds the
      // wildcard ".edgeLabel *" that also reaches the nested <p>.
      const paragraphRules = labelRules.filter(rule => rule.slice(0, rule.indexOf('{')).split(',').some(selector => /\.edgeLabel\s+(?:p|\*)\s*$/.test(selector.trim())));
      const lightParagraph = paragraphRules.some(rule => /background(?:-color)?:\s*(?:rgba?\(\s*(?:232|211|221|236|255)|lightgr[ae]y|#(?:ddd|d3d3d3|ececec|fff))/i.test(rule));
      const fixedParagraph = paragraphRules.some(rule => /background(?:-color)?:\s*(?:#0B0F14|transparent)[^;}]*!important/i.test(rule));
      record.grayParagraphDefect = record.edgeLabelElements > 0 && /class="edgeLabel"[^>]*>\s*<p\b/.test(svg) && lightParagraph && !fixedParagraph;
      record.paragraphRules = paragraphRules;
      delete record.labelRules;
      delete record.lightLabelRules;
      svgResults.push(record);
    } catch (error) { svgResults.push({ url, courses: refs.courses, error: error.message }); }
  }));
  console.error(`SVG audit ${Math.min(i + 12, entries.length)}/${entries.length}`);
}
console.log(JSON.stringify({ courses: result.map(c => ({ slug: c.slug, status: c.status, modules: c.modules, diagrams: c.images.length, styledProseParagraphs: c.styledProseParagraphs, bareImportedImg: c.images.filter(i => !i.inFigure).length, figuresWithCaption: c.images.filter(i => i.inFigure && i.figcaption).length, missingCaptions: c.images.filter(i => i.captionInBody === false).map(i => i.module), uncaptionedSource: c.images.filter(i => i.sourceMatched && !i.caption).length, unmatched: c.images.filter(i => !i.sourceMatched).length, changedSourceHash: c.images.filter(i => i.sourceHashDiffers).length, graySvgCount: svgResults.filter(s => s.courses.includes(c.slug) && s.grayParagraphDefect).length })), svgs: svgResults.filter(s => s.grayParagraphDefect || s.error || s.status !== 200), svgTotal: svgResults.length, themes: svgResults.reduce((a,s) => {a[s.theme || 'error'] = (a[s.theme || 'error'] || 0) + 1; return a;}, {}) }));
