import fs from 'fs';

const REPL_BYTES = Buffer.from([0xef, 0xbf, 0xbd]);  // U+FFFD

const files = [
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

for (const f of files) {
  const rawBuf = fs.readFileSync(f);
  const replCount = countOccurrences(rawBuf, REPL_BYTES);

  console.log(`FILE: ${f.split('/').slice(-2).join('/')} (${replCount} replacements)`);

  // Show context around first 8 replacements
  let searchFrom = 0;
  let shown = 0;
  while (shown < 8) {
    const bytePos = rawBuf.indexOf(REPL_BYTES, searchFrom);
    if (bytePos === -1) break;

    // Get surrounding bytes and try to reconstruct the intended line
    const start = Math.max(0, bytePos - 15);
    const end = Math.min(rawBuf.length, bytePos + 25);
    const snippet = rawBuf.slice(start, end);

    // Convert to a string-safe representation
    const hex = snippet.toString('hex');
    const printable = snippet.toString('utf8').replace(/\n/g, '\\n');

    console.log(`  [byte offset ${bytePos}]: hex=${hex}`);
    console.log(`    text: ${printable}`);

    searchFrom = bytePos + 3;
    shown++;
  }
}

function countOccurrences(buf, pattern) {
  let count = 0, idx = 0;
  while ((idx = buf.indexOf(pattern, idx)) !== -1) { count++; idx += pattern.length; }
  return count;
}