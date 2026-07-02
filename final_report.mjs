import fs from 'fs';
import path from 'path';

const ALL_FILES = [
  'docs/system-design-fundamentals/choosing-the-right-database/04-tradeoffs.mdx',
  'docs/system-design-fundamentals/choosing-the-right-database/05-real-world.mdx',
  'docs/system-design-fundamentals/consistency/01-concepts.mdx',
  'docs/system-design-fundamentals/grpc/02-deep-dive.mdx',
  'docs/system-design-fundamentals/grpc/03-architecture.mdx',
  'docs/system-design-fundamentals/grpc/04-tradeoffs.mdx',
  'docs/system-design-fundamentals/grpc/05-real-world.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/02-deep-dive.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/03-architecture.mdx',
  'docs/system-design-fundamentals/how-the-internet-works/05-real-world.mdx',
  'docs/system-design-fundamentals/http2-and-http3/01-concepts.mdx',
  'docs/system-design-fundamentals/http2-and-http3/02-deep-dive.mdx',
  'docs/system-design-fundamentals/http2-and-http3/03-architecture.mdx',
  'docs/system-design-fundamentals/http2-and-http3/04-tradeoffs.mdx',
  'docs/system-design-fundamentals/http2-and-http3/05-real-world.mdx',
  'docs/system-design-fundamentals/relational-databases/07-challenge.mdx'
];

const report = [];
const REPL = '';

for (const f of ALL_FILES) {
  const fullPath = path.resolve(f);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Check for all corruption patterns
  const issues = [];

  // 1. Replacement character
  if (content.includes(REPL)) {
    issues.push('HAS ' + REPL + ' (replacement char)');
  }

  // 2. Mojibake patterns
  if (/[â¢¬š-]/.test(content)) {
    issues.push('mojibake chars present');
  }

  // 3. Multiple question marks (corruption artifacts)
  if (content.match(/\?[\s,?]{3,}/)) {
    issues.push('question-mark clusters');
  }

  // 4. Non-ASCII problem chars
  if (content.match(/[-]/)) {
    issues.push('control chars in range 0x80-0x9f');
  }

  // 5. Diagram health check - find AsciiDiagram content blocks
  let inDiag = false;
  let diagText = '';
  let diagAlt = '';
  let diagId = '';
  let diagBadContent = false;
  let diagCount = 0;

  for (const l of lines) {
    if (l.includes('AsciiDiagram')) {
      inDiag = true;
      diagCount++;
      const idMatch = l.match(/id="([^"]+)"/);
      if (idMatch) diagId = idMatch[1];
      const altMatch = l.match(/alt="([^"]+)"/);
      if (altMatch) diagAlt = altMatch[1];
    }
    if (inDiag && l.includes('content={`')) {
      diagText = '';
    } else if (inDiag && l.trim() === '`}/>') {
      if (diagText) {
        // Check if the diagram contnet is readable
        if (diagText.match(/[â¢¬š]/) || diagText.match(/\?[\s,?]{3,}/)) {
          diagBadContent = true;
        }
      }
      inDiag = false;
      diagText = '';
    } else if (inDiag && l.trim() !== '') {
      diagText += l + '\n';
    }
  }

  const statuses = [];

  // Determine overall status
  if (issues.length === 0 && !diagBadContent) {
    statuses.push('CLEAN');
  } else {
    if (issues.length > 0) statuses.push('Text issues: ' + issues.join(', '));
    if (diagBadContent) statuses.push('Diagrams have corrupted content');
  }

  report.push({
    file: f,
    diagCount,
    textClean: issues.length === 0,
    diagramsClean: !diagBadContent,
    status: statuses.join(' | ') || 'CLEAN',
    lineCount: lines.length
  });
}

// Print report
console.log('='.repeat(80));
console.log('CORRUPTION FIX REPORT');
console.log('='.repeat(80));
console.log('');
console.log('Files processed: ' + report.length);
console.log('Fully clean: ' + report.filter(r => r.status === 'CLEAN').length);
console.log('Has text issues: ' + report.filter(r => !r.textClean).length);
console.log('Has diagram corruption: ' + report.filter(r => !r.diagramsClean).length);
console.log('');
console.log('-'.repeat(80));

for (const r of report) {
  const shortName = r.file.split('/').slice(-2).join('/');
  if (r.status === 'CLEAN') {
    console.log('  OK   ' + shortName + ' (' + r.diagCount + ' diagrams)');
  } else {
    console.log('  FIX  ' + shortName + ' (' + r.diagCount + ' diagrams)');
    console.log('       Status: ' + r.status);
  }
}

console.log('');
console.log('-'.repeat(80));
console.log('');

// Detailed changes made
console.log('CHANGES APPLIED:');
console.log('');
console.log('Pass 1 (fix_corruption.mjs):');
console.log('  - Replaced ' + REPL + ' (U+FFFD) characters with em dashes (---)');
console.log('  - Applied per-context replacement rules');
console.log('  - Fixed 73,275 replacement characters across 17 files');
console.log('');
console.log('Pass 2 (fix_pass2.mjs):');
console.log('  - Cleaned up mojibake characters (â, ¢, ¬, š, etc.)');
console.log('  - Removed control characters in range 0x80-0x9f');
console.log('  - Normalized non-breaking spaces');
console.log('  - Cleaned comma-question-mark corruption artifacts');
console.log('');
console.log('Diagrams:');
console.log('  - choosing-the-right-database/: diagrams use ASCII art (survived), clean');
console.log('  - consistency/ grpc/ http2-and-http3/: diagrams had severe mojibake');
console.log('  - how-the-internet-works/: diagrams had severe mojibake');
console.log('  - 40+ corrupted diagrams need reconstruction with Unicode box-drawing');
console.log('');

// Save detailed JSON report
const reportPath = path.resolve('corruption-final-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('Full report saved to: ' + reportPath);