#!/usr/bin/env node
// Content-fidelity guardrail for authored Mermaid diagrams. The landscape gate
// (check-landscape-band.mjs) proves SHAPE; nothing in it proves the Mermaid
// says what the source ASCII says. Authoring agents were caught (wave 1,
// 2026-09-19) inventing structure: extra edges ("Cache Miss", "Health -> Alert
// Routing"), and grouping titles ("Request path", "Legend") that are not in the
// source. This script catches the text-detectable part of that, plus a layout
// defect the gate cannot see: sibling panels rendered in REVERSE order.
//
// Checks, per .mmd (matched to its diagram via the diagram manifests' mmdFile):
//   1. INVENTED TITLE  (blocking)  a subgraph title containing a word (>=4 chars)
//      that appears nowhere in the diagram's source ASCII content or its title=
//      attribute. Titles must come from the source; use a blank title `[" "]`
//      for a purely structural grouping cluster.
//   2. PANEL ORDER     (blocking)  top-level sibling panels with no link between
//      them whose rendered reading order (row, then column, from the SVG) differs
//      from declaration order. Fix: chain them (`A ~~~ B ~~~ C`) with an LR root.
//      Skipped if the SVG for the current .mmd content has not been rendered yet.
//   3. INVENTED WORDS  (advisory)  label / edge-label words absent from the
//      source (content + title + alt + caption). Review for invented edges or
//      annotations; `< >` rewritten as below/above etc. is tolerated.
// It cannot detect an invented EDGE between existing nodes — compare arrows in
// the rendered image to the ASCII for anything the advisory list flags.
//
// Usage:
//   node scripts/check-diagram-fidelity.mjs <mmd-file...> | --list files.txt
//        [--json] [--blank-invented-titles]
//   --blank-invented-titles  rewrite flagged titles to " " IN PLACE (the .mmd
//        hash changes, so re-run the gate and re-wire afterwards).
//   --fix-panel-order  for sibling panels that render in the wrong order and sit in ONE ROW or ONE COLUMN,
//        set the parent's direction (LR / TB) to match and chain the panels in declaration order
//        (`A ~~~ B ~~~ C`). 2-D grids are reported, not fixed. Re-run the gate afterwards (hash changes).
//   Intended-order override: put `%% fidelity-order: A,B,C` in the .mmd when the correct left-to-right / top-to-bottom
//   order of sibling panels differs from declaration order (a cyclic flow the renderer mirrors).
// Exit code: 1 if any blocking finding remains, else 0.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
const SVG_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'static', 'img', 'diagrams');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const blank = args.includes('--blank-invented-titles');
const fixOrder = args.includes('--fix-panel-order');
let files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--list') { files.push(...fs.readFileSync(args[++i], 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)); continue; }
  if (!args[i].startsWith('--')) files.push(args[i]);
}
files = files.map((f) => path.resolve(f));
if (!files.length) { console.error('Usage: node scripts/check-diagram-fidelity.mjs <mmd-file...> | --list files.txt [--json] [--blank-invented-titles]'); process.exit(1); }

// ---------- manifest lookup ----------
const byBase = new Map();
for (const f of fs.readdirSync(MANIFEST_DIR)) {
  if (!f.endsWith('.json') || f === 'summary.json') continue;
  let m; try { m = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, f), 'utf8')); } catch { continue; }
  for (const d of m.diagrams || []) if (d.mmdFile) byBase.set(path.basename(d.mmdFile), d);
}

// ---------- <AsciiDiagram> extraction (brace/backtick aware) ----------
function extractTags(src) {
  const tags = []; let i = 0; const O = '<AsciiDiagram';
  while (true) {
    const s = src.indexOf(O, i); if (s < 0) break;
    let j = s + O.length, bd = 0, bt = false, e = -1;
    while (j < src.length) {
      const ch = src[j];
      if (bt) { if (ch === '\\') { j += 2; continue; } if (ch === '`') bt = false; j++; continue; }
      if (ch === '`') { bt = true; j++; continue; }
      if (ch === '{') { bd++; j++; continue; }
      if (ch === '}') { bd--; j++; continue; }
      if (bd === 0 && ch === '/' && src[j + 1] === '>') { e = j + 2; break; }
      j++;
    }
    if (e < 0) { i = s + O.length; continue; }
    tags.push(src.slice(s, e)); i = e;
  }
  return tags;
}
const attr = (t, n) => { const m = t.match(new RegExp(`\\b${n}="([^"]*)"`)); return m ? m[1] : ''; };
const contentOf = (t) => { const m = t.match(/content=\{\s*`([\s\S]*?)`\s*\}/); return m ? m[1] : ''; };

// ---------- word handling ----------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
const STOP = new Set('the and for with from that this into are was not but its can may any all you your our their then than also when what which will each one two per via'.split(' '));
const SYMBOL_WORDS = new Set(['below', 'above', 'less', 'greater', 'than', 'over', 'under', 'equals', 'equal', 'least', 'more']);
function wordSet(text) { return new Set(norm(text).split(' ').filter(Boolean)); }
function absentWords(text, srcWords, srcHasSymbols) {
  const out = [];
  for (const w of norm(text).split(' ')) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    if (srcHasSymbols && SYMBOL_WORDS.has(w)) continue;
    const stem = w.replace(/(ing|ed|es|s)$/, '');
    if (srcWords.has(w) || (stem.length >= 4 && [...srcWords].some((x) => x.startsWith(stem)))) continue;
    out.push(w);
  }
  return out;
}
const stripBr = (s) => s.replace(/<\/?(div|b)[^>]*>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/style='[^']*'/g, ' ').replace(/#\w+;/g, ' ');
// Numbered step/stage markers carry reading order when a long chain is split into rows (canonical
// rule 5c) — they are structural, not invented, so a title that IS just a marker is allowed, and an
// invented prefix on a marker is trimmed down to the marker.
const STEP_RE = /(steps?|stages?|phases?|parts?)\s+\d+(?:\s*(?:to|-|–|and)\s*\d+)?\s*$/i;
const isStepMarker = (t) => { const m = t.match(STEP_RE); return !!m && m.index === 0; };
const stepSuffix = (t) => { const m = t.match(STEP_RE); return m ? m[0][0].toUpperCase() + m[0].slice(1) : null; };

// ---------- mmd structure ----------
function parseStructure(lines) {
  const subgraphs = []; // { id, title, depth, lineIdx }
  let depth = 0;
  lines.forEach((raw, idx) => {
    const l = raw.trim();
    const m = l.match(/^subgraph\s+([A-Za-z0-9_]+)\s*(?:\[\s*"?([^\]"]*)"?\s*\])?/) || l.match(/^subgraph\s+"([^"]*)"/);
    if (/^subgraph\b/.test(l)) {
      const id = m ? (m[2] !== undefined || l.includes('[') ? m[1] : m[1]) : null;
      const title = m ? (m[2] !== undefined ? m[2] : (l.match(/^subgraph\s+"([^"]*)"/) ? m[1] : '')) : '';
      subgraphs.push({ id, title: title ?? '', depth, idx });
      depth++;
    } else if (l === 'end') { const open = [...subgraphs].reverse().find((x) => x.depth === depth - 1 && x.endIdx === undefined); if (open) open.endIdx = idx; depth = Math.max(0, depth - 1); }
  });
  return subgraphs;
}
// Sibling groups: every set of >=2 clusters that share a parent (or are both top-level). Reading order
// among siblings is only guaranteed by a VISIBLE edge between them; an invisible link (~~~) ranks/stacks
// them but leaves left-right order to the renderer, which mirrors siblings (seen in wave 1 and wave 2).
function siblingGroups(subgraphs, lines) {
  const stack = []; const groups = new Map();
  for (const sg of subgraphs) {
    while (stack.length && stack[stack.length - 1].depth >= sg.depth) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].id : '(root)';
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(sg);
    stack.push(sg);
  }
  const out = [];
  for (const [parent, kids] of groups) {
    if (kids.length < 2) continue;
    const linked = lines.some((raw) => {
      const l = raw.trim(); if (!/(-->|---|==>)/.test(l)) return false;
      return kids.filter((p) => new RegExp('(^|[^A-Za-z0-9_])' + p.id + '([^A-Za-z0-9_]|$)').test(l)).length >= 2;
    });
    const ids = kids.map((k) => k.id);
    // `%% fidelity-order: A,B,C` states the INTENDED reading order when it differs from declaration order
    // (e.g. a cyclic flow whose panels the renderer mirrors, fixed by declaring them reversed).
    const dir = lines.map((l) => l.match(/^\s*%%\s*fidelity-order:\s*(.+?)\s*$/)).filter(Boolean).map((m) => m[1].split(/\s*,\s*/));
    const intended = dir.find((d) => d.length === ids.length && d.every((i) => ids.includes(i))) || ids;
    if (!linked) out.push({ parent, parentSg: parent === '(root)' ? null : subgraphs.find((x) => x.id === parent), ids, intended });
  }
  return out;
}

// (order directive: see siblingGroups)
// Sets the parent's direction and chains the panels in declaration order. Edits job.lines in place and
// writes the file. Returns true if applied.
function applyOrderFix(job, g, dir) {
  const lines = job.lines;
  const chain = '    ' + g.intended.join(' ~~~ ');
  if (g.parent === '(root)') {
    const h = lines.findIndex((l) => /^\s*(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/.test(l));
    if (h < 0) return false;
    lines[h] = lines[h].replace(/(flowchart|graph)\s+(TD|TB|LR|RL|BT)/, '$1 ' + dir);
    lines.push(chain);
  } else {
    // re-parse: earlier fixes in the same file shift line indices, so g.parentSg may be stale
    const sg = parseStructure(lines).find((x) => x.id === g.parent); if (!sg || sg.endIdx === undefined) return false;
    let d = -1;
    for (let i = sg.idx + 1; i < sg.endIdx; i++) { if (/^\s*direction\s+/.test(lines[i])) { d = i; break; } if (/^\s*subgraph\b/.test(lines[i])) break; }
    if (d >= 0) lines[d] = lines[d].replace(/direction\s+\w+/, 'direction ' + dir);
    else lines.splice(sg.idx + 1, 0, '    direction ' + dir);
    const end = sg.endIdx + (d >= 0 ? 0 : 1);
    lines.splice(end, 0, chain);
  }
  fs.writeFileSync(job.file, lines.join('\n'), 'utf8');
  return true;
}

// Real on-page positions: nested clusters live in transformed <g> groups, so raw x/y attributes are LOCAL
// coordinates. Load each SVG in the same headless Chromium mmdc uses and read getBoundingClientRect.
async function measureOrders(jobs) {
  if (!jobs.length) return;
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    for (const job of jobs) {
      const page = await browser.newPage();
      try {
        await page.goto(pathToFileURL(job.svgPath).href);
        for (const g of job.groups) {
          const rects = await page.evaluate((ids) => ids.map((id) => {
            const el = document.getElementById('my-svg-' + id) || document.getElementById(id);
            if (!el) return null;
            const r = (el.querySelector('rect') || el).getBoundingClientRect();
            return { id, cx: r.x + r.width / 2, cy: r.y + r.height / 2, h: r.height };
          }), g.ids);
          if (rects.some((r) => !r)) continue; // cannot measure -> do not block
          const read = [...rects].sort((p, q) => (Math.abs(p.cy - q.cy) < Math.min(p.h, q.h) * 0.5 ? p.cx - q.cx : p.cy - q.cy)).map((r) => r.id);
          if (JSON.stringify(read) !== JSON.stringify(g.intended)) {
            const rows = new Set(rects.map((r) => Math.round(r.cy / Math.max(1, Math.min(...rects.map((q) => q.h)) * 0.5))));
            const oneRow = rects.every((r) => Math.abs(r.cy - rects[0].cy) < Math.min(r.h, rects[0].h) * 0.5);
            const oneCol = rects.every((r) => Math.abs(r.cx - rects[0].cx) < 40);
            const layout = oneRow ? 'row' : oneCol ? 'column' : 'grid';
            const finding = { kind: 'panel-order', parent: g.parent, declared: g.intended, rendered: read, layout };
            if (fixOrder && layout !== 'grid') {
              if (applyOrderFix(job, g, layout === 'row' ? 'LR' : 'TB')) { finding.fixed = true; job.res.fixedOrder = (job.res.fixedOrder || []).concat(g.parent); }
            }
            if (!finding.fixed) job.res.blocking.push(finding);
          }
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}

// ---------- main ----------
const srcCache = new Map();
const results = [];
const jobs = [];
for (const file of files) {
  const res = { file, id: null, blocking: [], advisory: [], skipped: null };
  const entry = byBase.get(path.basename(file));
  if (!entry) { res.skipped = 'not in any manifest'; results.push(res); continue; }
  res.id = entry.id;
  const mdx = path.join(REPO_ROOT, entry.file);
  if (!srcCache.has(mdx)) srcCache.set(mdx, extractTags(fs.readFileSync(mdx, 'utf8')));
  const tag = srcCache.get(mdx)[entry.diagramIndex - 1];
  if (!tag) { res.skipped = 'source tag not found'; results.push(res); continue; }
  const content = contentOf(tag);
  const strictWords = wordSet(`${content} ${attr(tag, 'title')}`);
  const lenientWords = wordSet(`${content} ${attr(tag, 'title')} ${attr(tag, 'alt')} ${attr(tag, 'caption')}`);
  const srcHasSymbols = /[<>≥≤]/.test(content);

  let text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const sgs = parseStructure(lines);

  // 1. invented titles
  const fixes = []; // { sg, to, finding } — mechanical fixes for --blank-invented-titles
  for (const sg of sgs) {
    const title = stripBr(sg.title || '').trim();
    if (!title || isStepMarker(title)) continue;
    const bad = absentWords(title, strictWords, srcHasSymbols);
    if (!bad.length) continue;
    // any word of the title (even a short one like CAP) that IS in the source makes it a mixed title
    const hasRealWord = norm(title).split(' ').some((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w) && strictWords.has(w));
    const fullyInvented = !hasRealWord;
    const suffix = stepSuffix(title);
    const finding = { kind: 'invented-title', subgraph: sg.id, title: title.slice(0, 70), words: bad, mixed: false };
    if (suffix) fixes.push({ sg, to: suffix, finding });
    else if (fullyInvented) fixes.push({ sg, to: ' ', finding });
    else finding.mixed = true; // real source words + invented ones: needs a human edit
    res.blocking.push(finding);
  }
  if (blank && fixes.length) {
    for (const { sg, to } of fixes) {
      lines[sg.idx] = lines[sg.idx].replace(/^(\s*subgraph\s+[A-Za-z0-9_]+)\s*\[[^\]]*\]/, '$1["' + to + '"]');
    }
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    res.blanked = fixes.map((f) => f.sg.id + (f.to.trim() ? ' -> "' + f.to + '"' : ''));
    const done = new Set(fixes.map((f) => f.finding));
    res.blocking = res.blocking.filter((x) => !done.has(x));
    text = lines.join('\n');
  }

  // 2. panel order (needs the SVG for the CURRENT content)
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  const svgPath = path.join(SVG_DIR, `${hash}.svg`);
  const sibGroups = siblingGroups(parseStructure(lines), lines);
  if (sibGroups.length && fs.existsSync(svgPath)) jobs.push({ res, svgPath, groups: sibGroups, file, lines });

  // 3. invented label words (advisory)
  const body = text.replace(/%%\{[\s\S]*?\}%%/g, '');
  const labels = [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  for (const m of body.matchAll(/--\s+([A-Za-z][A-Za-z0-9 ]*?)\s+-->/g)) labels.push(m[1]);
  const titleSet = new Set(sgs.map((s) => stripBr(s.title || '').trim()));
  const inv = new Map();
  for (const lab of labels) {
    const t = stripBr(lab).trim(); if (!t || titleSet.has(t)) continue;
    for (const w of absentWords(t, lenientWords, srcHasSymbols)) inv.set(w, t.slice(0, 60));
  }
  for (const [w, l] of inv) res.advisory.push({ kind: 'invented-word', word: w, label: l });
  results.push(res);
}

await measureOrders(jobs);

const blockingCount = results.filter((r) => r.blocking.length).length;
if (jsonOut) console.log(JSON.stringify(results, null, 2));
else {
  for (const r of results) {
    if (r.skipped) { console.log(`SKIP   ${path.basename(r.file)}  (${r.skipped})`); continue; }
    if (r.blanked) console.log(`BLANKED ${r.id}  titles: ${r.blanked.join(', ')}`);
    if (r.fixedOrder) console.log(`ORDERFIX ${r.id}  chained panels in: ${r.fixedOrder.join(', ')}  (re-run the gate)`);
    for (const b of r.blocking) console.log(b.kind === 'invented-title'
      ? `FAIL   ${r.id}  invented title ${b.subgraph}: "${b.title}"  (words not in source: ${b.words.join(', ')})${b.mixed ? '  [MIXED: real + invented words, edit by hand]' : ''}`
      : `FAIL   ${r.id}  panel order differs in ${b.parent}: declared [${b.declared}] renders [${b.rendered}]  (layout: ${b.layout}${b.layout === 'grid' ? ' - fix by hand' : ''})`);
    if (r.advisory.length) console.log(`REVIEW ${r.id}  label words not in source: ${r.advisory.slice(0, 5).map((a) => `${a.word} ← "${a.label}"`).join(' | ')}`);
  }
  const rev = results.filter((r) => r.advisory.length).length;
  console.log(`\n${results.length} checked: ${blockingCount} with blocking findings, ${rev} with advisory label-word findings to review.`);
}
process.exit(blockingCount ? 1 : 0);
