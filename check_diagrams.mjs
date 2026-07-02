import fs from 'fs';

const files = [
  'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/02-deep-dive.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/03-architecture.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/05-real-world.mdx'
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  let inDiag = false;
  let diagramCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('AsciiDiagram')) {
      diagramCount++;
      console.log('=== ' + f.split('/').slice(-2).join('/') + ' Diagram #' + diagramCount + ' (line ' + (i+1) + ') ===');
      // Print the diagram header lines
      let j = i;
      while (j < lines.length && !lines[j].includes('content={')) {
        console.log('  ' + lines[j].substring(0, 120));
        j++;
      }
      if (j < lines.length) {
        console.log('  ' + lines[j].substring(0, 120));
      }
      // Find content end
      let k = j + 1;
      let contentLines = [];
      while (k < lines.length) {
        const trimmed = lines[k].trim();
        if (trimmed.endsWith('`}')) {
          console.log('  Diagram content (' + contentLines.length + ' lines, ends at line ' + (k+1) + ')');
          console.log('  First 3 lines:');
          for (let ci = 0; ci < Math.min(3, contentLines.length); ci++) {
            console.log('    "' + contentLines[ci].substring(0, 80) + '"');
          }
          if (contentLines.length > 3) {
            console.log('    ...');
            console.log('    "' + contentLines[contentLines.length-1].substring(0, 80) + '"');
          }
          break;
        }
        contentLines.push(lines[k]);
        k++;
      }
      inDiag = false;
    }
  }
  console.log('  Total diagrams: ' + diagramCount);
  console.log('');
}