#!/usr/bin/env node
// Scoped variant of render-mermaid-manifest.mjs: renders only .mmd files
// matching a given prefix (e.g. "search-algorithms-") instead of the whole
// .cache/ascii-to-mermaid/ directory. Same hashing/render/retry logic.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const PREFIX = process.argv[2];
if (!PREFIX) {
  console.error("Usage: node render-search-algorithms-mermaid.mjs <filename-prefix>");
  process.exit(1);
}

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MMD_DIR = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid");
const OUT_DIR = path.join(REPO_ROOT, "apps", "docs", "static", "img", "diagrams");
const MANIFEST_PATH = path.join(REPO_ROOT, ".cache", "ascii-to-mermaid-images", `manifest-${PREFIX}.json`);

mkdirSync(OUT_DIR, { recursive: true });

const mmdFiles = readdirSync(MMD_DIR).filter((f) => f.endsWith(".mmd") && f.startsWith(PREFIX)).sort();
console.log(`Found ${mmdFiles.length} .mmd files matching prefix "${PREFIX}"`);
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
