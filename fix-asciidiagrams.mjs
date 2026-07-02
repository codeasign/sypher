#!/usr/bin/env node
// Fix broken AsciiDiagram patterns in .mdx files under docs/system-design-fundamentals/

import fs from 'fs';
import path from 'path';

const baseDir = 'D:/jenny/sypher/docs/system-design-fundamentals';

// Get all .mdx files recursively
function getAllMdxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllMdxFiles(baseDir);
let totalFixed = 0;

function replaceAll(str, search, replacement) {
  return str.split(search).join(replacement);
}

for (const fullPath of files) {
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  let fixed = false;

  // FIX 1: `}</AsciiDiagram> -> `} />
  if (content.includes('`}</AsciiDiagram>')) {
    content = replaceAll(content, '`}</AsciiDiagram>', '`} />');
    console.log(`  FIX1: \\`}</AsciiDiagram> -> \\`} /> in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 2: Remove </AsciiDiagram> after />
  const before2 = content;
  content = content.replace(/(`\s*\}\s*\/\s*>\s*)\s*<\/AsciiDiagram>/gs, '$1');
  if (content !== before2) {
    console.log(`  FIX2: Removed </AsciiDiagram> after /> in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 3: &gt; entity -> >
  if (content.includes('`}&gt;')) {
    content = replaceAll(content, '`}&gt;', '`} />');
    console.log(`  FIX3: \\`}&gt; -> \\`} /> in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 4: `}> -> `} />
  if (content.includes('`}>')) {
    content = replaceAll(content, '`}>', '`} />');
    console.log(`  FIX4: \\`}> -> \\`} /> in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 5: Remove `</AsciiDiagram>` after `} (no />)
  const before5 = content;
  content = content.replace(/`\s*\}\s*<\/AsciiDiagram>/gs, '`} />');
  if (content !== before5) {
    console.log(`  FIX5: \\`}</AsciiDiagram> -> \\`} /> in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 6: Fix `{\` opening (backslash before backtick) -> `{`
  const before6 = content;
  content = content.replace(/\{`\r?\n/g, '{\n');
  if (content !== before6) {
    console.log(`  FIX6: Removed backslash before backtick in ${path.basename(fullPath)}`);
    fixed = true;
  }

  // FIX 7: Convert opened-tag AsciiDiagram to self-closing with content prop
  // Pattern: <AsciiDiagram (attrs)>\n{`\n(content)\n`}\n... props ... />
  // Regex must handle: {\ as opening, {` as opening, `} as closing
  const before7 = content;

  content = content.replace(
    /<AsciiDiagram\s+([\s\S]*?)>\r?\n\s*\{\r?\n([\s\S]*?)`\}\s*\r?\n([\s\S]*?)\/>/g,
    (match, attrs, diagramContent, tailProps) => {
      const cleanAttrs = attrs.trim().replace(/>?\s*$/, '').trim();
      let extraProps = tailProps.trim();

      let result = `<AsciiDiagram\n  ${cleanAttrs}`;

      if (diagramContent.trim()) {
        result += `\n  content={\n${diagramContent}\n  }`;
      }

      if (extraProps) {
        result += `\n  ${extraProps}`;
      }

      result += ' />';

      console.log(`  FIX7: Converted opened-tag in ${path.basename(fullPath)}`);
      fixed = true;
      return result;
    }
  );

  // FIX 8: Also handle {` opening (without backslash)
  const before8 = content;
  content = content.replace(
    /<AsciiDiagram\s+([\s\S]*?)>\r?\n\s*\{`\r?\n([\s\S]*?)`\}\s*\r?\n([\s\S]*?)\/>/g,
    (match, attrs, diagramContent, tailProps) => {
      const cleanAttrs = attrs.trim().replace(/>?\s*$/, '').trim();
      let extraProps = tailProps.trim();

      let result = `<AsciiDiagram\n  ${cleanAttrs}`;

      if (diagramContent.trim()) {
        result += `\n  content={\`\n${diagramContent}\n  \`}`;
      }

      if (extraProps) {
        result += `\n  ${extraProps}`;
      }

      result += ' />';

      console.log(`  FIX8: Converted opened-tag (no backslash) in ${path.basename(fullPath)}`);
      fixed = true;
      return result;
    }
  );

  // FIX 9: Handle AsciiDiagram with `}` closing (not `}/>`) followed by </AsciiDiagram>
  // Pattern: <AsciiDiagram ... content={`\n...\n`}</AsciiDiagram>
  const before9 = content;
  content = content.replace(
    /<AsciiDiagram\s+([\s\S]*?)\{`\s*\n([\s\S]*?)`\}\s*<\/AsciiDiagram>/gs,
    (match, beforeContent, diagramContent) => {
      // The tag has some props but no />, just </AsciiDiagram> closing
      // Add /> after the closing `}
      const cleanAttrs = beforeContent.trim();
      let result = `<AsciiDiagram\n  ${cleanAttrs}\n  content={\n${diagramContent}\n  } />`;
      console.log(`  FIX9: Fixed content={\\` block with </AsciiDiagram> in ${path.basename(fullPath)}`);
      fixed = true;
      return result;
    }
  );

  // FIX 10: Fix double backtick issue: content={`\n{` -> remove extra {`
  content = content.replace(/content=\{`\s*\r?\n\{`/g, 'content={`\n');

  if (fixed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalFixed++;
    console.log(`  => SAVED ${path.basename(fullPath)}\n`);
  }
}

console.log(`\nDone! ${totalFixed} files were fixed.`);