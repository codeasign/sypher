#!/usr/bin/env node
// Generates .cache/diagram-gallery.html — a local, self-contained viewer page
// listing every rendered mermaid diagram grouped course-wise, with previews
// and links to the raw SVG files. Paths are relative to the repo root, so
// open the page from there (file:// works fine; no server needed).
//
// Usage:
//   node scripts/generate-diagram-gallery.mjs
//   start .cache/diagram-gallery.html   (or just open it in a browser)

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFESTS = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
const OUT = path.join(REPO_ROOT, '.cache', 'diagram-gallery.html');
// Page-relative (the page sits in .cache/, one level below the repo root).
const REL_PREFIX = '../apps/docs/static/img/diagrams/';

const courses = [];
for (const f of readdirSync(MANIFESTS)) {
  if (!f.endsWith('.json') || f === 'summary.json') continue;
  const course = f.replace(/\.json$/, '');
  const m = JSON.parse(readFileSync(path.join(MANIFESTS, f), 'utf8'));
  const diags = (Array.isArray(m) ? m : m.diagrams || m.entries || [])
    .filter((d) => d.mermaidSrcWiredIn && d.mermaidSrc)
    .map((d) => ({ id: d.id, hash: path.basename(d.mermaidSrc, '.svg') }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (diags.length) courses.push({ course, diags });
}
courses.sort((a, b) => a.course.localeCompare(b.course));

const total = courses.reduce((n, c) => n + c.diags.length, 0);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jesc = (s) => JSON.stringify(s);

const sections = courses
  .map(({ course, diags }) => {
    const cards = diags
      .map(
        ({ id, hash }) => `
      <figure class="card" data-key="${jesc((course + ' ' + id).toLowerCase())}">
        <a href="diagram-viewer.html?src=${encodeURIComponent(`${REL_PREFIX}${hash}.svg`)}" target="_blank" rel="noopener">
          <img loading="lazy" src="${REL_PREFIX}${hash}.svg" alt="${jesc(id)}">
        </a>
        <figcaption>
          <div class="did">${esc(id)}</div>
          <div class="hash">${hash}</div>
        </figcaption>
      </figure>`
      )
      .join('\n');
    return `
    <section id="c-${esc(course)}">
      <h2>${esc(course)} <span class="count">${diags.length}</span></h2>
      <div class="grid">${cards}
      </div>
    </section>`;
  })
  .join('\n');

const toc = courses
  .map(({ course, diags }) => `<a href="#c-${esc(course)}">${esc(course)}<span>${diags.length}</span></a>`)
  .join('\n');

writeFileSync(
  OUT,
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sypher Diagram Gallery</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #0B0F14; color: #E8EEF5;
    font: 14px/1.5 Consolas, 'Cascadia Code', monospace;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    background: #0B0F14ee; border-bottom: 1px solid #33465C;
    padding: 12px 20px; backdrop-filter: blur(4px);
  }
  h1 { margin: 0 0 8px; font-size: 18px; }
  header .meta { color: #7E93A8; margin-bottom: 8px; }
  #filter {
    width: min(480px, 90vw); padding: 8px 10px;
    background: #16202C; border: 1px solid #33465C; border-radius: 6px;
    color: #E8EEF5; font: inherit;
  }
  nav.toc { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; }
  nav.toc a { color: #5EA3E6; text-decoration: none; font-size: 12px; }
  nav.toc a:hover { text-decoration: underline; }
  nav.toc span { color: #7E93A8; margin-left: 4px; }
  main { padding: 16px 20px 60px; }
  section h2 { font-size: 15px; border-bottom: 1px solid #33465C; padding-bottom: 6px; margin: 28px 0 14px; scroll-margin-top: 120px; }
  h2 .count { color: #57B26A; font-size: 12px; margin-left: 6px; }
  .grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  figure.card {
    margin: 0; display: flex; flex-direction: column;
    border: 1px solid #33465C; border-radius: 8px; overflow: hidden;
    background: #101720;
  }
  figure.card.hidden { display: none; }
  section.hidden { display: none; }
  figure.card a { display: block; background: #0B0F14; text-align: center; }
  figure.card img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  figcaption { padding: 8px 10px; border-top: 1px solid #22303f; }
  .did { word-break: break-all; font-size: 12px; }
  .hash { color: #7E93A8; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
<header>
  <h1>Sypher Diagram Gallery</h1>
  <div class="meta">${total} rendered diagrams across ${courses.length} courses &middot; click a card to open the raw SVG</div>
  <input id="filter" type="search" placeholder="Filter by diagram id or course&hellip;" autocomplete="off">
  <nav class="toc">${toc}</nav>
</header>
<main>
${sections}
</main>
<script>
  const filter = document.getElementById('filter');
  const cards = [...document.querySelectorAll('figure.card')];
  const sections = [...document.querySelectorAll('main > section')];
  function apply() {
    const q = filter.value.trim().toLowerCase();
    let anyCourseEmpty;
    for (const s of sections) {
      let visible = 0;
      for (const c of s.querySelectorAll('figure.card')) {
        const show = !q || c.dataset.key.includes(q);
        c.classList.toggle('hidden', !show);
        if (show) visible++;
      }
      s.classList.toggle('hidden', q !== '' && visible === 0);
    }
  }
  filter.addEventListener('input', apply);
</script>
</body>
</html>
`,
  'utf8'
);

console.log(`Wrote ${OUT}`);
console.log(`${total} diagrams across ${courses.length} courses`);
console.log(`Open from repo root: start .cache\\diagram-gallery.html`);
