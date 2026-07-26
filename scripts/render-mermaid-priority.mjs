#!/usr/bin/env node
// Same rendering logic as render-mermaid-manifest.mjs, but scoped to a
// filename-prefix filter so a handful of courses can be prioritized ahead
// of a full directory sweep. Usage: node render-mermaid-priority.mjs <prefix1> [prefix2] ...
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MMD_DIR = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid");
const OUT_DIR = path.join(REPO_ROOT, "apps", "docs", "static", "img", "diagrams");

const prefixes = process.argv.slice(2);
mkdirSync(OUT_DIR, { recursive: true });

// See render-mermaid-manifest.mjs for why this is needed: mmdc emits
// width="100%" with no height, which gives an <img> no real intrinsic size
// and causes it to stretch to fill the content column instead of rendering
// at its actual size.
function fixIntrinsicSize(svgPath) {
  let svg = readFileSync(svgPath, "utf8");
  if (!svg.includes('width="100%"')) return;
  const m = svg.match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/);
  if (!m) return;
  const [, w, h] = m;
  svg = svg.replace('width="100%"', `width="${w}" height="${h}"`);
  writeFileSync(svgPath, svg);
}

const mmdFiles = readdirSync(MMD_DIR)
  .filter((f) => f.endsWith(".mmd"))
  .filter((f) => prefixes.some((p) => f.startsWith(p)))
  .sort();

console.log(`Rendering ${mmdFiles.length} files matching prefixes: ${prefixes.join(", ")}`);

for (const file of mmdFiles) {
  const mmdPath = path.join(MMD_DIR, file);
  const source = readFileSync(mmdPath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const svgPath = path.join(OUT_DIR, `${hash}.svg`);

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
    } catch (err) {
      if (attempt === 2) {
        console.log(`FAIL ${file}: ${(err.stderr ? err.stderr.toString() : String(err)).slice(0, 300)}`);
      }
    }
  }
  console.log(`${ok ? "OK  " : "FAIL"} ${file} -> ${hash}.svg`);
}
