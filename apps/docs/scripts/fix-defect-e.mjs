import fs from 'fs';
import path from 'path';

const files = [
  'docs/ai-engineering-hands-on/using-openrouter/02-practice-exercise.mdx',
  'docs/ai-engineering-hands-on/running-models-locally-with-ollama/01-overview.mdx',
  'docs/ai-engineering-hands-on/running-models-locally-with-ollama/02-practice-exercise.mdx',
  'docs/ai-engineering-hands-on/running-models-locally-with-ollama/03-general-practice.mdx',
  'docs/ai-engineering-hands-on/building-a-model-router-with-fallback/01-overview.mdx',
  'docs/ai-engineering-hands-on/cloud-vs-local-tradeoffs/01-overview.mdx'
];

let totalFixed = 0;
files.forEach(filePath => {
  let c = fs.readFileSync(filePath, 'utf8');
  const original = c;

  // Pattern 1: opening tag with props > newline ```...``` newline </AsciiDiagram>
  // Matches: <AsciiDiagram ...props...>\n\n```\n...content...\n```\n\n</AsciiDiagram>
  const pattern1 = /(<AsciiDiagram[\s\S]*?)(\s*)>\s*\n\s*```\s*\n([\s\S]*?)\n\s*```\s*\n\s*<\/AsciiDiagram>/g;
  c = c.replace(pattern1, (match, opening, indent, content) => {
    const cleaned = content.replace(/\s+$/, '');
    // If the opening already has a content prop, just remove the closing tag
    if (/content=/.test(opening)) {
      return opening + ' />';
    }
    return opening + ' content={`' + cleaned + '\n`} />';
  });

  // Pattern 2: opening tag with props >\n{`...`}\n</AsciiDiagram>
  const pattern2 = /(<AsciiDiagram[\s\S]*?)(\s*)>\s*\n\{`([\s\S]*?)`\}\s*\n\s*<\/AsciiDiagram>/g;
  c = c.replace(pattern2, (match, opening, indent, content) => {
    return opening + ' content={`' + content + '`} />';
  });

  if (c !== original) {
    const residual = (c.match(/<\/AsciiDiagram>/g) || []).length;
    if (residual > 0) {
      console.log(filePath + ': WARNING - ' + residual + ' residual </AsciiDiagram> tags remain');
    }
    fs.writeFileSync(filePath, c, 'utf8');
    totalFixed++;
    console.log('Fixed: ' + filePath);
  } else {
    console.log('No change: ' + filePath);
  }
});

console.log('Defect E fix complete. Files fixed: ' + totalFixed);