#!/usr/bin/env node
// Detects harness-shadow bugs: cases where a problem's harness re-declares
// the same class/struct/function the student's starterCode is meant to
// implement. Read-only -- reports findings, does not edit anything (the
// actual removal differs too much file-to-file, e.g. some harnesses keep
// unrelated helper types, to safely automate).
//
// Usage: node scripts/detect-harness-shadow.mjs <file1.mdx> [file2.mdx ...]

import { readFileSync } from 'node:fs';

const LANGS = ['python', 'java', 'cpp', 'javascript', 'typescript', 'rust', 'c', 'csharp', 'go'];

// Extract a template-literal value for `key: \`...\`` from a JS object-literal
// source, handling nested backslash-escaped backticks (\`) inside the literal
// (same convention used throughout this repo's harness content).
function extractTemplateLiteral(src, key) {
  const marker = `${key}: \``;
  const start = src.indexOf(marker);
  if (start === -1) return null;
  let i = start + marker.length;
  let out = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && src[i + 1] === '`') { out += '`'; i += 2; continue; }
    if (ch === '`') break;
    out += ch;
    i++;
  }
  return out;
}

function extractBlock(src, blockKey) {
  const idx = src.indexOf(`${blockKey}={{`);
  if (idx === -1) return null;
  let depth = 0, i = idx + blockKey.length + 2, start = i - 1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth < 0) break; }
  }
  return src.slice(start, i + 1);
}

// Declared top-level symbol name per language, extracted from starterCode.
const NAME_PATTERNS = {
  python: /class\s+(\w+)|def\s+(\w+)\s*\(/,
  java: /class\s+(\w+)/,
  cpp: /class\s+(\w+)/,
  javascript: /class\s+(\w+)|function\s+(\w+)\s*\(/,
  typescript: /class\s+(\w+)|function\s+(\w+)\s*\(/,
  rust: /struct\s+(\w+)|fn\s+(\w+)\s*\(/,
  c: /\}\s*(\w+);|(\w+)\s*\(/, // typedef struct {...} Name; OR a plain function name -- checked specially below
  csharp: /class\s+(\w+)/,
  go: /type\s+(\w+)\s+struct|func\s+(\w+)\s*\(/,
};

function firstDeclaredName(lang, code) {
  if (lang === 'c') {
    const td = code.match(/\}\s*(\w+);/);
    if (td) return td[1];
    const fn = code.match(/^\s*[\w*]+\s+(\w+)\s*\(/m);
    return fn ? fn[1] : null;
  }
  const pat = NAME_PATTERNS[lang];
  const m = code.match(pat);
  if (!m) return null;
  return m[1] || m[2] || null;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return (haystack.match(re) || []).length;
}

function analyze(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const starterBlock = extractBlock(src, 'starterCode');
  const harnessBlock = extractBlock(src, 'harness');
  if (!starterBlock || !harnessBlock) {
    console.log(`${filePath}: could not locate starterCode/harness blocks`);
    return;
  }

  console.log(`\n=== ${filePath} ===`);
  for (const lang of LANGS) {
    const starterCode = extractTemplateLiteral(starterBlock, lang);
    const harnessCode = extractTemplateLiteral(harnessBlock, lang);
    if (starterCode == null || harnessCode == null) continue; // language not used by this file

    const name = firstDeclaredName(lang, starterCode);
    if (!name) {
      console.log(`  ${lang}: could not determine declared symbol name from starterCode -- check manually`);
      continue;
    }
    // "Declared" in the harness beyond just a call-site reference: look for
    // a definition keyword immediately preceding/around the name, not just
    // any mention (a mention alone is expected -- that's the harness calling it).
    const defPatterns = {
      python: new RegExp(`(class|def)\\s+${name}\\b`),
      java: new RegExp(`class\\s+${name}\\b`),
      cpp: new RegExp(`class\\s+${name}\\b`),
      javascript: new RegExp(`(class|function)\\s+${name}\\b`),
      typescript: new RegExp(`(class|function)\\s+${name}\\b`),
      rust: new RegExp(`(struct|fn)\\s+${name}\\b`),
      c: new RegExp(`\\}\\s*${name};|\\b\\w+\\s+${name}\\s*\\(`),
      csharp: new RegExp(`class\\s+${name}\\b`),
      go: new RegExp(`(type\\s+${name}\\s+struct|func\\s+${name}\\s*\\()`),
    };
    const isShadowed = defPatterns[lang].test(harnessCode);
    const mentions = countOccurrences(harnessCode, name);
    const flag = isShadowed ? '⚠️  SHADOW' : '   clean';
    console.log(`  ${lang}: ${flag}  (declared name: "${name}", ${mentions} mention(s) in harness)`);
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/detect-harness-shadow.mjs <file1.mdx> [file2.mdx ...]');
  process.exit(1);
}
for (const f of files) analyze(f);
