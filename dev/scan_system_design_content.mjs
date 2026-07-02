import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = 'D:/jenny/sypher/docs/system-design-fundamentals';

// Collect all .mdx and .md files
function collectFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      results.push(full);
    }
  }
  return results;
}

const files = collectFiles(ROOT);
console.log(`Total files: ${files.length}\n`);

// Defect patterns
const MOJIBAKE_BOX = /â[”•–†]/g;               // â”€ → ─, â•" → ═, â–ˆ → █, â†' → →
const MOJIBAKE_MULTI = /ÃƒÆ'Ã‚Â¢|ÃƒÆ'Ã†'|ÃƒÂ¢Ã¢â‚¬|ÃƒÂ¢Ã¢Â¬|ÃƒÂ¢Ã¢â€š|ÃƒÂ\?Ã‚Â|ÃƒÆ'Ã‚|Ã¢â‚¬â€|Ã¢â‚¬â„¢|Ã¢â‚¬âœ|Ã¢â„¢Â|ÃƒÆ'Ã‚Â/g;
const MOJIBAKE_PUNCT = /[?]{4,}[a-z]?[?]{0,}/gi;
const FRONTMATTER_BODY = /^(?!---).*?\bid:\s*|^(?!---).*?\btitle:\s*/m;
const ASCII_DIAGRAM_EMPTY = /<AsciiDiagram[^>]*>\s*```\s*```\s*<\/AsciiDiagram>/g;
const ASCII_DIAGRAM_SHORT = /<AsciiDiagram[^>]*>\s*```\s*.{0,20}\s*```\s*<\/AsciiDiagram>/gs;
const EMPTY_FENCE = /```\w*\n\s*```\n/g;
const UNCLOSED_FENCE = /```[a-zA-Z0-9_+#]*\n[\s\S]*?(?!```)/g;

let fileResults = [];

for (const file of files) {
  const relPath = relative(ROOT, file);
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`Cannot read ${relPath}: ${e.message}`);
    continue;
  }

  const defects = [];
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Defect A: Mojibake box-drawing
  let mojiMatch;
  const mojiBoxLines = new Set();
  while ((mojiMatch = MOJIBAKE_BOX.exec(content)) !== null) {
    const lineNum = content.substring(0, mojiMatch.index).split('\n').length;
    mojiBoxLines.add(lineNum);
  }
  if (mojiBoxLines.size > 0) {
    defects.push({ class: 'A (single-layer box)', lines: [...mojiBoxLines].sort((a,b)=>a-b) });
  }

  // Defect A: Multi-layer mojibake
  let mojiMultiMatch;
  const mojiMultiLines = new Set();
  while ((mojiMultiMatch = MOJIBAKE_MULTI.exec(content)) !== null) {
    const lineNum = content.substring(0, mojiMultiMatch.index).split('\n').length;
    mojiMultiLines.add(lineNum);
  }
  if (mojiMultiLines.size > 0) {
    defects.push({ class: 'A (multi-layer)', lines: [...mojiMultiLines].sort((a,b)=>a-b) });
  }

  // Defect A: Punctuation mojibake
  let punctMatch;
  const punctLines = new Set();
  while ((punctMatch = MOJIBAKE_PUNCT.exec(content)) !== null) {
    // Skip things inside code blocks
    const lineNum = content.substring(0, punctMatch.index).split('\n').length;
    punctLines.add(lineNum);
  }
  if (punctLines.size > 0) {
    defects.push({ class: 'A (punctuation)', lines: [...punctLines].sort((a,b)=>a-b) });
  }

  // Defect A2: Corrupted frontmatter fence
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.trim() !== '---' || firstLine !== '---') {
      // Check if it contains frontmatter keywords rendering as body
      const first20Lines = lines.slice(0, 20).join('\n');
      if (/^id:|^title:|^sidebar_position:|^sidebar_label:/.test(first20Lines) ||
          (firstLine !== '---' && /id:|title:|sidebar/.test(first20Lines))) {
        defects.push({ class: 'A2 (frontmatter fence)', lines: [1, 'First line is not exactly `---`'] });
      }
    }
  }

  // Defect B: Empty or whitespace-only AsciiDiagram
  // Look for <AsciiDiagram with empty backtick content
  const asciiEmptyMatch = content.match(/<AsciiDiagram[^>]*>\s*```\s*\n\s*```\s*<\/AsciiDiagram>/g);
  if (asciiEmptyMatch) {
    defects.push({ class: 'B (empty diagram)', lines: ['diagram content empty'] });
  }

  // Also check for AsciiDiagram with content under 20 chars
  const asciiMatches = content.matchAll(/<AsciiDiagram[^>]*>\s*```\s*(.*?)```\s*<\/AsciiDiagram>/gs);
  for (const m of asciiMatches) {
    const inner = m[1].trim();
    if (inner.length < 10) {
      const lineNum = content.substring(0, m.index).split('\n').length;
      defects.push({ class: 'B (tiny/empty diagram)', lines: [lineNum, `content length: ${inner.length}`] });
    }
  }

  // Defect C: Empty code blocks
  const emptyFenceMatches = content.match(/```\w*\n\s*```/g);
  if (emptyFenceMatches) {
    defects.push({ class: 'C (empty code block)', lines: [`${emptyFenceMatches.length} empty fence(s)`] });
  }

  // Defect C: Unclosed fence (odd number of ``` markers)
  const fenceMarkers = content.match(/^```/gm);
  if (fenceMarkers && fenceMarkers.length % 2 !== 0) {
    // Find approximate location
    const lastIdx = content.lastIndexOf('```');
    const lineNum = content.substring(0, lastIdx).split('\n').length;
    defects.push({ class: 'C (unclosed fence)', lines: [lineNum, `odd fence count: ${fenceMarkers.length}`] });
  }

  // Defect D: Suspiciously short content body
  // Check if the rendered content is very short relative to total lines
  // Also check for content that looks absorbed into a diagram or fence
  if (totalLines > 50) {
    // Check if a large portion of the file is inside an unclosed block
    const hasOpenAscii = /<AsciiDiagram[^>]*>\s*```\s*[^]*?(?=<\/AsciiDiagram>|$)/g;
    const openDiagrams = [...content.matchAll(hasOpenAscii)];
    for (const d of openDiagrams) {
      if (!d[0].includes('</AsciiDiagram>') && d[0].includes('```')) {
        const lineNum = content.substring(0, d.index).split('\n').length;
        defects.push({ class: 'D (unclosed diagram)', lines: [lineNum, 'diagram may eat content'] });
      }
    }
  }

  if (defects.length > 0) {
    fileResults.push({ file: relPath, defects });
  }
}

// Print results as a table
console.log('=== DEFECT REPORT ===\n');
let countA = 0, countA2 = 0, countB = 0, countC = 0, countD = 0;
for (const r of fileResults) {
  console.log(`\nFile: ${r.file}`);
  for (const d of r.defects) {
    console.log(`  ${d.class} @ lines ${d.lines.join(', ')}`);
    if (d.class.startsWith('A')) countA++;
    else if (d.class.startsWith('A2')) countA2++;
    else if (d.class.startsWith('B')) countB++;
    else if (d.class.startsWith('C')) countC++;
    else if (d.class.startsWith('D')) countD++;
  }
}

// Also count files with 0 defects
const cleanFiles = files.length - fileResults.length;

console.log(`\n\n=== SUMMARY ===`);
console.log(`Files scanned: ${files.length}`);
console.log(`Files with defects: ${fileResults.length}`);
console.log(`Clean files: ${cleanFiles}`);
console.log(`\nDefect A (mojibake, single-layer): TBD - need to count occurrences`);
console.log(`Defect A (mojibake, multi-layer): TBD`);
console.log(`Defect A2 (frontmatter): ${countA2}`);
console.log(`Defect B (empty diagrams): ${countB}`);
console.log(`Defect C (empty/broken blocks): ${countC}`);
console.log(`Defect D (eaten content): ${countD}`);
console.log(`\nFiles with defects:`);
fileResults.forEach(r => console.log(`  ${r.file} - ${r.defects.map(d => d.class).join(', ')}`));