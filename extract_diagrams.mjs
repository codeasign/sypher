import fs from 'fs';

function extractDiagramInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];

  const lines = content.split('\n');
  let inDiagram = false;
  let currentAlt = '';
  let currentCaption = '';
  let currentId = '';
  let diagramLines = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('AsciiDiagram') || l.includes('asciiDiagram')) {
      const idMatch = l.match(/id="([^"]+)"/);
      if (idMatch) currentId = idMatch[1];
      const altMatch = l.match(/alt="([^"]+)"/);
      if (altMatch) currentAlt = altMatch[1];
      const capMatch = l.match(/caption="([^"]+)"/);
      if (capMatch) currentCaption = capMatch[1];
    }
    if (l.includes('content={`') || l.includes('content={`')) {
      inDiagram = true;
      continue;
    }
    if (inDiagram) {
      // Check end of content block
      const trimmed = l.trimEnd();
      if (trimmed.endsWith('`}') || trimmed.endsWith('"}')) {
        // Add the line minus the closing marker
        const content_part = trimmed.substring(0, trimmed.length - 2);
        if (content_part) diagramLines.push(content_part);
        inDiagram = false;
        results.push({
          id: currentId, alt: currentAlt, caption: currentCaption,
          diagramLines: [...diagramLines],
          lineStart: i - diagramLines.length,
          lineEnd: i
        });
        currentId = ''; currentAlt = ''; currentCaption = ''; diagramLines = [];
        continue;
      }
      diagramLines.push(l);
    }
  }
  return results;
}

const files = [
  'docs/system-design-fundamentals/consistency/01-concepts.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx',
  'docs/system-design-fundamentals/http2-and-http3/01-concepts.mdx',
  'docs/system-design-fundamentals/http2-and-http3/03-architecture.mdx',
  'docs/system-design-fundamentals/grpc/02-deep-dive.mdx',
  'docs/system-design-fundamentals/grpc/03-architecture.mdx',
  'docs/system-design-fundamentals/choosing-the-right-database/04-tradeoffs.mdx',
  'docs/system-design-fundamentals/http2-and-http3/02-deep-dive.mdx'
];

for (const f of files) {
  console.log('\n=== ' + f.split('/').slice(-2).join('/') + ' ===');
  const diagrams = extractDiagramInfo(f);
  console.log('Found ' + diagrams.length + ' diagram(s)');
  for (const d of diagrams) {
    console.log('  Diagram: ' + d.id);
    console.log('  Alt: ' + d.alt.substring(0, 120));
    console.log('  Caption: ' + (d.caption || '(none)'));
    console.log('  Lines (' + d.diagramLines.length + '):');
    for (let i = 0; i < Math.min(d.diagramLines.length, 8); i++) {
      console.log('    ' + i + ': "' + d.diagramLines[i].substring(0, 120) + '"');
    }
    if (d.diagramLines.length > 8) console.log('    ... (' + (d.diagramLines.length - 8) + ' more lines)');
    console.log('');
  }
}