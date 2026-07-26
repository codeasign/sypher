#!/usr/bin/env node
// One-off: remove the "## Prerequisites" section (heading through its
// content, up to but not including the next "## " heading) from every
// given file. Prints a diff-free before/after line count per file.
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node remove-prerequisites-section.mjs <file1> [file2 ...]");
  process.exit(1);
}

for (const file of files) {
  const before = readFileSync(file, "utf8");
  // Match "## Prerequisites" through the next "## " heading (exclusive),
  // including the blank line(s) immediately before "## Prerequisites" so
  // we don't leave a double blank line behind.
  const pattern = /\n{1,}## Prerequisites\n[\s\S]*?(?=\n## )/;
  if (!pattern.test(before)) {
    console.log(`SKIP (no match): ${file}`);
    continue;
  }
  const after = before.replace(pattern, "");
  if (after === before) {
    console.log(`NOCHANGE: ${file}`);
    continue;
  }
  writeFileSync(file, after, "utf8");
  console.log(`OK: ${file} (${before.split("\n").length} -> ${after.split("\n").length} lines)`);
}
