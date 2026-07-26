#!/usr/bin/env node
// Wires mermaidSrc="/img/diagrams/<hash>.svg" into each <AsciiDiagram> tag in
// search-algorithms .mdx files, using the manifest produced by
// render-search-algorithms-mermaid.mjs. Matches each .mmd file's trailing
// -N index back to that diagram's 1-based source-order position in its .mdx
// file (counting ALL AsciiDiagram tags, including any already wired).
// Never touches id/content/alt/caption — only adds the mermaidSrc prop.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DOCS_ROOT = path.join(REPO_ROOT, "apps", "docs", "docs");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", "manifest-search-algorithms-.json");
const COURSE_PREFIX = "search-algorithms-";

function extractAsciiDiagramTags(source) {
  const tags = [];
  const OPEN = "<AsciiDiagram";
  let i = 0;
  while (true) {
    const start = source.indexOf(OPEN, i);
    if (start === -1) break;
    let j = start + OPEN.length;
    let braceDepth = 0;
    let inBacktick = false;
    let end = -1;
    while (j < source.length) {
      const ch = source[j];
      if (inBacktick) {
        if (ch === "\\") { j += 2; continue; }
        if (ch === "`") inBacktick = false;
        j++;
        continue;
      }
      if (ch === "`") { inBacktick = true; j++; continue; }
      if (ch === "{") { braceDepth++; j++; continue; }
      if (ch === "}") { braceDepth--; j++; continue; }
      if (braceDepth === 0 && ch === "/" && source[j + 1] === ">") { end = j + 2; break; }
      j++;
    }
    if (end === -1) { i = start + OPEN.length; continue; }
    tags.push({ start, end, text: source.slice(start, end) });
    i = end;
  }
  return tags;
}

function hasMermaidSrc(tagText) {
  return /\bmermaidSrc=/.test(tagText);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

// Group manifest entries by pageSlug -> { N: svgPath }
const byPage = new Map();
for (const entry of manifest) {
  const m = entry.mmdFile.match(/^(.*)-(\d+)\.mmd$/);
  if (!m) { console.warn(`Skipping unrecognized mmd filename: ${entry.mmdFile}`); continue; }
  const [, pageSlug, nStr] = m;
  const n = parseInt(nStr, 10);
  if (!entry.rendered) { console.warn(`Skipping unrendered: ${entry.mmdFile}`); continue; }
  if (!byPage.has(pageSlug)) byPage.set(pageSlug, new Map());
  byPage.get(pageSlug).set(n, "/" + path.relative(path.join(REPO_ROOT, "apps", "docs", "static"), path.join(REPO_ROOT, entry.svgPath)).replace(/\\/g, "/"));
}

let totalWired = 0, totalAlready = 0, totalMissingManifestEntry = 0;
const report = [];

for (const [pageSlug, indexMap] of byPage) {
  if (!pageSlug.startsWith(COURSE_PREFIX)) { console.warn(`Skipping non-search-algorithms page: ${pageSlug}`); continue; }
  const fileName = pageSlug.slice(COURSE_PREFIX.length) + ".mdx";
  const filePath = path.join(DOCS_ROOT, "search-algorithms", fileName);

  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (err) {
    console.warn(`Cannot read ${filePath}: ${err.message}`);
    continue;
  }

  const tags = extractAsciiDiagramTags(source);
  const replacements = [];
  let wiredHere = 0, alreadyHere = 0, missingHere = 0;

  tags.forEach((tag, idx) => {
    const n = idx + 1; // 1-based source-order index
    if (hasMermaidSrc(tag.text)) { alreadyHere++; return; }
    const svgSrc = indexMap.get(n);
    if (!svgSrc) { missingHere++; console.warn(`  ${fileName}: no manifest entry for diagram #${n}`); return; }
    const newTagText = tag.text.replace("/>", ` mermaidSrc="${svgSrc}" />`);
    replacements.push({ start: tag.start, end: tag.end, newTagText });
    wiredHere++;
  });

  if (replacements.length > 0) {
    replacements.sort((a, b) => b.start - a.start);
    for (const { start, end, newTagText } of replacements) {
      source = source.slice(0, start) + newTagText + source.slice(end);
    }
    writeFileSync(filePath, source, "utf8");
  }

  totalWired += wiredHere;
  totalAlready += alreadyHere;
  totalMissingManifestEntry += missingHere;
  report.push({ file: fileName, totalTags: tags.length, wired: wiredHere, alreadyDone: alreadyHere, missing: missingHere });
}

console.log("\n=== Wiring report ===");
for (const r of report) {
  console.log(`${r.file}: total=${r.totalTags} wired=${r.wired} already=${r.alreadyDone} missing=${r.missing}`);
}
console.log(`\nTotals: wired=${totalWired} already=${totalAlready} missing=${totalMissingManifestEntry}`);
