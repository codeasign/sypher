import fs from 'fs';
import path from 'path';

const FILES = [
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

for (const relPath of FILES) {
  const fullPath = path.resolve(relPath);
  const originalStr = fs.readFileSync(fullPath, 'utf8');
  let str = originalStr;
  let changes = [];

  // 1. Fix bold vocab definitions: "**Packet** ???,???? The" -> "**Packet** - The"
  const newStr1 = str.replace(/\*\*([^*]+)\*\*\s+\?[\s,?]+\s+/g, '**$1** - ');
  if (newStr1 !== str) { changes.push('bold defs'); str = newStr1; }

  // 2. "word ???,???? word" -> "word - word"
  const newStr2 = str.replace(/([a-zA-Z])\s+\?[\s,?]+\s+([a-zA-Z])/g, '$1 - $2');
  if (newStr2 !== str) { changes.push('word separators'); str = newStr2; }

  // 3. Line-start corruption removal
  const newStr3 = str.replace(/^\s*\?[\s,?]+\s+/gm, '');
  if (newStr3 !== str) { changes.push('line-start cleanup'); str = newStr3; }

  // 4. Isolated question-mark clusters
  const newStr4 = str.replace(/\?[\s,?]{2,}/g, ' - ');
  if (newStr4 !== str) { changes.push('Q clusters'); str = newStr4; }

  // 5. "? " at end of line
  const newStr5 = str.replace(/\? \n/g, '\n');
  if (newStr5 !== str) { changes.push('trailing ?'); str = newStr5; }

  // 6. "?," standalone
  const newStr6 = str.replace(/\?,\s/g, ' ');
  if (newStr6 !== str) { changes.push('?,'); str = newStr6; }

  // 7. ",?" standalone
  const newStr7 = str.replace(/,\?\s/g, ' ');
  if (newStr7 !== str) { changes.push(',?'); str = newStr7; }

  // 8. Stray "â" (U+00E2) and "¢" (U+00A2) from corrupted box-drawing
  const newStr8 = str.replace(/[â¢¬š]/g, '');
  if (newStr8 !== str) { changes.push('mojibake chars'); str = newStr8; }

  // 9. Control chars U+0080-U+009F
  const newStr9 = str.replace(/[-]/g, '');
  if (newStr9 !== str) { changes.push('control chars'); str = newStr9; }

  // 10. NBSP
  const newStr10 = str.replace(/ /g, ' ');
  if (newStr10 !== str) { changes.push('nbsp'); str = newStr10; }

  // 11. " - - " after em dash replacements
  const newStr11 = str.replace(/ - - /g, ' - ');
  if (newStr11 !== str) { changes.push('double dash'); str = newStr11; }

  // 12. Collapse multiple spaces
  const newStr12 = str.replace(/ {3,}/g, '  ');
  if (newStr12 !== str) { changes.push('spaces'); str = newStr12; }

  // Write back if changed
  if (changes.length > 0) {
    fs.writeFileSync(fullPath, str, 'utf8');
    console.log(relPath.split('/').slice(-2).join('/') + ': ' + changes.join(', ') + ' (' + (originalStr.length - str.length) + ' bytes)');
    report.push({ file: relPath, changes, bytesRemoved: originalStr.length - str.length });
  } else {
    console.log(relPath.split('/').slice(-2).join('/') + ': clean');
    report.push({ file: relPath, changes: [], bytesRemoved: 0 });
  }
}

const reportPath = path.resolve('corruption-fix-pass2-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('\n=== Summary ===');
console.log('Files with fixes: ' + report.filter(r => r.changes.length > 0).length);
console.log('Report saved to ' + reportPath);