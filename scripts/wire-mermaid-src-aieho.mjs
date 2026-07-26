#!/usr/bin/env node
// One-off: wire mermaidSrc into every <AsciiDiagram> in
// apps/docs/docs/ai-engineering-hands-on/, using the manifest produced by
// render-mermaid-manifest.mjs. Run from repo root.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", "manifest.json");
const COURSE_DIR = path.join(REPO_ROOT, "apps", "docs", "docs", "ai-engineering-hands-on");

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const entries = Object.values(manifest).filter(
  (e) => e.mmdFile && e.mmdFile.startsWith("ai-engineering-hands-on-")
);

// key: "<topic-slug>|<file-slug>" -> hash[] indexed by N-1
const hashMap = {};
const re = /^ai-engineering-hands-on-(.+)-(overview|practice-exercise|general-practice)-(\d+)\.mmd$/;
for (const e of entries) {
  const m = e.mmdFile.match(re);
  if (!m) {
    console.error("UNMATCHED mmdFile pattern:", e.mmdFile);
    continue;
  }
  const [, topicSlug, fileSlug, nStr] = m;
  const key = `${topicSlug}|${fileSlug}`;
  const n = parseInt(nStr, 10);
  if (!hashMap[key]) hashMap[key] = [];
  hashMap[key][n - 1] = e.hash;
  if (!e.rendered) console.error("NOT RENDERED:", e.mmdFile);
}

const fileSlugFor = (basename) => {
  if (basename === "01-overview.mdx") return "overview";
  if (basename === "02-practice-exercise.mdx") return "practice-exercise";
  if (basename === "03-general-practice.mdx") return "general-practice";
  return null;
};

let totalWired = 0;
let filesTouched = 0;
const problems = [];

for (const topicSlug of readdirSync(COURSE_DIR)) {
  const topicPath = path.join(COURSE_DIR, topicSlug);
  let files;
  try {
    files = readdirSync(topicPath);
  } catch {
    continue;
  }
  for (const basename of files) {
    const fileSlug = fileSlugFor(basename);
    if (!fileSlug) continue;
    const filePath = path.join(topicPath, basename);
    let content = readFileSync(filePath, "utf8");
    const matchCount = (content.match(/<AsciiDiagram\b/g) || []).length;
    if (matchCount === 0) continue;

    const key = `${topicSlug}|${fileSlug}`;
    const hashes = hashMap[key];
    if (!hashes || hashes.length !== matchCount) {
      problems.push(
        `${topicSlug}/${basename}: expected ${matchCount} diagrams, found ${hashes ? hashes.length : 0} manifest hashes for key "${key}"`
      );
      continue;
    }
    if (content.includes("mermaidSrc=")) {
      problems.push(`${topicSlug}/${basename}: already has mermaidSrc, skipping (idempotent guard)`);
      continue;
    }

    let i = 0;
    content = content.replace(/<AsciiDiagram\b/g, () => {
      const hash = hashes[i];
      i++;
      return `<AsciiDiagram mermaidSrc="/img/diagrams/${hash}.svg"`;
    });

    writeFileSync(filePath, content);
    totalWired += matchCount;
    filesTouched++;
    console.log(`OK   ${topicSlug}/${basename}  (${matchCount} diagrams)`);
  }
}

console.log(`\nFiles touched: ${filesTouched}`);
console.log(`Diagrams wired: ${totalWired}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log("  " + p));
}
