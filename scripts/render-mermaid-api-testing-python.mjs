#!/usr/bin/env node
// Targeted render for just the api-testing-python course's new .mmd files —
// avoids re-rendering all 900 existing diagrams the way the full
// render-mermaid-manifest.mjs would. Appends to the existing manifest.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MMD_DIR = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid");
const OUT_DIR = path.join(REPO_ROOT, "apps", "docs", "static", "img", "diagrams");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", "manifest.json");

mkdirSync(OUT_DIR, { recursive: true });

function fixIntrinsicSize(svgPath) {
  let svg = readFileSync(svgPath, "utf8");
  if (!svg.includes('width="100%"')) return;
  const m = svg.match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/);
  if (!m) return;
  const [, w, h] = m;
  svg = svg.replace('width="100%"', `width="${w}" height="${h}"`);
  writeFileSync(svgPath, svg);
}

const targetFiles = process.argv.slice(2);
if (targetFiles.length === 0) {
  console.error("Usage: node render-mermaid-api-testing-python.mjs <file1.mmd> <file2.mmd> ...");
  process.exit(1);
}

const existingManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const manifest = [];

for (const file of targetFiles) {
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

const merged = existingManifest.filter((e) => !targetFiles.includes(e.mmdFile)).concat(manifest);
writeFileSync(MANIFEST_PATH, JSON.stringify(merged, null, 2));
console.log(`\nManifest updated: ${MANIFEST_PATH}`);
