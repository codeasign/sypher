#!/usr/bin/env node
// Fixes Defect E variant 2: <AsciiDiagram ...>```\n...\n```\n[trailing prose]</AsciiDiagram>
// (plain markdown fence + optional trailing text as children, entirely
// dropped since the component doesn't read children) ->
// <AsciiDiagram ... content={`...\n\n<trailing prose>`} />
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'docs';
const DRY_RUN = process.argv.includes('--dry-run');

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
let totalFixed = 0, totalSkipped = 0, filesChanged = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let content = original;
  let fixedInFile = 0, skippedInFile = 0;

  content = content.replace(
    /<AsciiDiagram\b((?:\s+[a-zA-Z_-]+=(?:"[^"]*"|\{[^}]*\}))*)\s*>([\s\S]*?)<\/AsciiDiagram>/g,
    (whole, attrs, children) => {
      if (/\bcontent\s*=\s*\{/.test(attrs)) return whole; // already fine
      const trimmedChildren = children.trim();
      if (/^\{\s*`[\s\S]*`\s*\}$/.test(trimmedChildren)) return whole; // handled by the other pass

      const fenceMatch = trimmedChildren.match(/^```[a-zA-Z]*\r?\n([\s\S]*?)\r?\n```([\s\S]*)$/);
      if (!fenceMatch) {
        skippedInFile++;
        console.log(`  SKIP (still unrecognized) in ${file}: ${JSON.stringify(trimmedChildren.slice(0, 60))}`);
        return whole;
      }
      const diagramBody = fenceMatch[1].replace(/\r\n/g, '\n');
      const trailing = fenceMatch[2].trim().replace(/\r\n/g, '\n');
      const fullContent = trailing ? `${diagramBody}\n\n${trailing}` : diagramBody;

      // Escape backticks / ${ that would otherwise break the template literal
      const escaped = fullContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

      fixedInFile++;
      const trimmedAttrs = attrs.replace(/\s+$/, '');
      return `<AsciiDiagram${trimmedAttrs}\n  content={\`${escaped}\`}\n/>`;
    }
  );

  if (fixedInFile > 0) {
    filesChanged++;
    totalFixed += fixedInFile;
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}Fixed ${fixedInFile} in ${file}`);
    if (!DRY_RUN) writeFileSync(file, content, 'utf8');
  }
  totalSkipped += skippedInFile;
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total fixed: ${totalFixed} across ${filesChanged} files. Still skipped: ${totalSkipped}.`);
