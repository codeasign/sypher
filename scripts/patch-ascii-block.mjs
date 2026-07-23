import { readFileSync, writeFileSync } from 'node:fs';

// Usage: node patch-ascii-block.mjs <file> <anchor-substring> <mermaidSrc> <content-file>
const [file, anchor, mermaidSrc, contentFile] = process.argv.slice(2);
const content = readFileSync(file, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes(anchor));
if (startIdx === -1) { console.error('start not found for anchor:', anchor); process.exit(1); }
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].trim() === '} />') { endIdx = i; break; }
}
if (endIdx === -1) { console.error('end not found'); process.exit(1); }

const newDiagram = readFileSync(contentFile, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');

const newBlock = [
  lines[startIdx],
  `  mermaidSrc="${mermaidSrc}"`,
  '  content={`',
  newDiagram,
  '  `}',
  '/>',
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);
writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`Replaced lines ${startIdx + 1}-${endIdx + 1} (anchor: "${anchor.slice(0, 50)}...") with ${newBlock.length} new lines.`);
