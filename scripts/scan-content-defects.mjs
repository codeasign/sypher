#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'docs';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.mdx') || entry.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const findings = { fenceUnbalanced: [], emptyAscii: [], badFrontmatter: [], emptyFence: [] };

for (const file of files) {
  const content = readFileSync(file, 'utf8');

  // Defect C: unclosed/unbalanced fences (``` count must be even). Allow
  // leading whitespace — fences nested in list items are legitimately
  // indented and were previously undercounted, producing false positives.
  const fenceMatches = content.match(/^\s*```/gm) || [];
  if (fenceMatches.length % 2 !== 0) {
    findings.fenceUnbalanced.push({ file, count: fenceMatches.length });
  }

  // Defect C: genuinely empty fenced blocks — line-based, so a closing fence
  // immediately followed by the NEXT block's opening fence (e.g. ``` then
  // ```bash) is never mistaken for an empty block.
  {
    const lines = content.split('\n');
    let openLine = -1;
    let sawContent = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const isFenceLine = /^```[a-zA-Z0-9_-]*$/.test(trimmed);
      if (openLine === -1) {
        if (isFenceLine) { openLine = i; sawContent = false; }
      } else {
        if (isFenceLine) {
          if (!sawContent) {
            findings.emptyFence.push({ file, line: openLine + 1 });
          }
          openLine = -1;
        } else if (trimmed !== '') {
          sawContent = true;
        }
      }
    }
  }

  // Defect B: empty/near-empty AsciiDiagram content
  const asciiRe = /content=\{`([\s\S]*?)`\}/g;
  let m;
  let idx = 0;
  while ((m = asciiRe.exec(content)) !== null) {
    idx++;
    const inner = m[1].trim();
    if (inner.length < 20) {
      findings.emptyAscii.push({ file, index: idx, length: inner.length, preview: inner.slice(0, 40) });
    }
  }

  // Defect A2: frontmatter fence broken. Distinguish a bare UTF-8 BOM
  // (gray-matter strips this automatically, so it's cosmetic, not broken
  // rendering) from genuinely non-fenced frontmatter (something other than
  // BOM/whitespace before the `---`, which really does break parsing).
  const hasBOM = content.charCodeAt(0) === 0xFEFF;
  const stripped = hasBOM ? content.slice(1) : content;
  if (!stripped.startsWith('---') && /^(id|title|sidebar_position|sidebar_label):/m.test(stripped.slice(0, 500))) {
    findings.badFrontmatter.push({ file, type: 'frontmatter-not-fenced-non-bom' });
  } else if (hasBOM) {
    findings.badFrontmatter.push({ file, type: 'bom-only-cosmetic' });
  }
}

console.log('=== Defect C: unbalanced fence count (odd number of ``` markers) ===');
console.log(findings.fenceUnbalanced.length);
findings.fenceUnbalanced.forEach(f => console.log(`  ${f.file} (${f.count} fences)`));

console.log('\n=== Defect C: empty fenced code blocks ===');
console.log(findings.emptyFence.length);
findings.emptyFence.forEach(f => console.log(`  ${f.file}:${f.line}`));

console.log('\n=== Defect B: empty/near-empty AsciiDiagram content (<20 chars) ===');
console.log(findings.emptyAscii.length);
findings.emptyAscii.forEach(f => console.log(`  ${f.file} [#${f.index}] len=${f.length} preview="${f.preview}"`));

console.log('\n=== Defect A2: frontmatter fence issues ===');
const nonBom = findings.badFrontmatter.filter(f => f.type === 'frontmatter-not-fenced-non-bom');
const bomOnly = findings.badFrontmatter.filter(f => f.type === 'bom-only-cosmetic');
console.log(`  genuinely broken (non-BOM stray char before ---): ${nonBom.length}`);
nonBom.forEach(f => console.log(`    ${f.file}`));
console.log(`  BOM-only (cosmetic, gray-matter strips it, not visibly broken): ${bomOnly.length}`);

console.log(`\nTotal files scanned: ${files.length}`);
