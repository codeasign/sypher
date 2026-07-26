#!/usr/bin/env node
// Renders every .mmd file in .cache/ascii-to-mermaid/ to an SVG named by a
// content hash, via mmdc. Retries once on failure, then logs and skips.
// Run from apps/docs so the mmdc binary and relative output path resolve.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MMD_DIR = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid");
const OUT_DIR = path.join(REPO_ROOT, "apps", "docs", "static", "img", "diagrams");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", "manifest.json");

mkdirSync(OUT_DIR, { recursive: true });

// mmdc always emits width="100%" with no height attribute on the SVG root,
// intended for responsive inline embedding. When the SVG is instead used as
// an <img src="..."> (as AsciiDiagram does), a percentage width doesn't
// count as an intrinsic size to the browser, so a plain `width:auto` image
// has no real natural size to fall back to — it stretches to fill the
// content column's max-width instead of rendering at its actual small size.
// Replacing width="100%" with the real pixel width/height read off the
// viewBox gives the <img> a correct intrinsic size again.
function fixIntrinsicSize(svgPath) {
  let svg = readFileSync(svgPath, "utf8");
  if (!svg.includes('width="100%"')) return;
  const m = svg.match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/);
  if (!m) return;
  const [, w, h] = m;
  svg = svg.replace('width="100%"', `width="${w}" height="${h}"`);
  writeFileSync(svgPath, svg);
}

const mmdFiles = readdirSync(MMD_DIR).filter((f) => f.endsWith(".mmd")).sort();
const manifest = [];

for (const file of mmdFiles) {
  const mmdPath = path.join(MMD_DIR, file);
  const source = readFileSync(mmdPath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const svgPath = path.join(OUT_DIR, `${hash}.svg`);
  const entry = { mmdFile: file, hash, svgPath: path.relative(REPO_ROOT, svgPath), attempts: [] };

  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      execFileSync(
        "npx",
        ["--no-install", "mmdc", "-i", mmdPath, "-o", svgPath, "-b", "transparent"],
        { cwd: path.join(REPO_ROOT, "apps", "docs"), stdio: ["ignore", "pipe", "pipe"], shell: true }
      );
      fixIntrinsicSize(svgPath);
      ok = true;
      entry.attempts.push({ attempt, status: "success" });
    } catch (err) {
      entry.attempts.push({
        attempt,
        status: "error",
        stderr: (err.stderr ? err.stderr.toString() : String(err)).slice(0, 4000),
      });
    }
  }
  entry.rendered = ok;
  manifest.push(entry);
  console.log(`${ok ? "OK  " : "FAIL"} ${file} -> ${hash}.svg`);
}

mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\nManifest written to ${MANIFEST_PATH}`);
