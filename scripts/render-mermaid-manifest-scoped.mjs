#!/usr/bin/env node
// Scoped variant of render-mermaid-manifest.mjs: renders only .mmd files
// matching a filename prefix (argv[2]) instead of every file in the dir,
// and MERGES into the existing manifest instead of overwriting it. Used
// when converting one course's diagrams without re-rendering the whole
// repo's ~640 .mmd files.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MMD_DIR = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid");
const OUT_DIR = path.join(REPO_ROOT, "apps", "docs", "static", "img", "diagrams");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", "manifest.json");

const prefix = process.argv[2];
if (!prefix) {
  console.error("Usage: node render-mermaid-manifest-scoped.mjs <filename-prefix>");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const existingManifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) : [];
const byMmdFile = new Map(existingManifest.map((e) => [e.mmdFile, e]));

const mmdFiles = readdirSync(MMD_DIR).filter((f) => f.endsWith(".mmd") && f.startsWith(prefix)).sort();
console.log(`Found ${mmdFiles.length} .mmd files matching prefix "${prefix}"`);

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
  byMmdFile.set(file, entry);
  console.log(`${ok ? "OK  " : "FAIL"} ${file} -> ${hash}.svg`);
}

const mergedManifest = Array.from(byMmdFile.values());
mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
writeFileSync(MANIFEST_PATH, JSON.stringify(mergedManifest, null, 2));
console.log(`\nManifest updated (merged) at ${MANIFEST_PATH}`);
