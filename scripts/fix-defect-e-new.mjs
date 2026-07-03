import fs from 'fs';
import path from 'path';

const topics = [
  'getting-started-with-claude-code',
  'claude-code-workflows',
  'writing-custom-slash-commands',
  'automating-dev-tasks-with-claude-code',
  'claude-code-with-mcp-connectors'
];

function walkDir(dir) {
  const files = [];
  fs.readdirSync(dir, {withFileTypes: true}).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p).forEach(f => files.push(f));
    else if (e.name.endsWith('.mdx')) files.push(p);
  });
  return files;
}

let totalFixed = 0;

for (const topic of topics) {
  const dir = 'docs/ai-engineering-hands-on/' + topic;
  if (!fs.existsSync(dir)) continue;

  for (const filePath of walkDir(dir)) {
    let c = fs.readFileSync(filePath, 'utf8');
    const original = c;

    // Pattern: <AsciiDiagram ...props...>\n{`...content...`}\n/>
    // The diagram content uses {backtick...backtick} and the component closes with />
    const pattern = /(<AsciiDiagram[\s\S]*?)(\s*)>\s*\n\s*\{\s*`([\s\S]*?)`\s*\}\s*\n\s*\/>/g;
    c = c.replace(pattern, (match, opening, indent, content) => {
      return opening.trimEnd() + ' content={`' + content + '`} />';
    });

    // Pattern: <AsciiDiagram ...props...>\n{`...content...`}\n</AsciiDiagram>
    const pattern2 = /(<AsciiDiagram[\s\S]*?)(\s*)>\s*\n\s*\{\s*`([\s\S]*?)`\s*\}\s*\n\s*<\/AsciiDiagram>/g;
    c = c.replace(pattern2, (match, opening, indent, content) => {
      return opening.trimEnd() + ' content={`' + content + '`} />';
    });

    if (c !== original) {
      fs.writeFileSync(filePath, c, 'utf8');
      console.log('Fixed Defect E: ' + filePath);
      totalFixed++;
    }
  }
}

console.log('Total files fixed: ' + totalFixed);