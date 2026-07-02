import fs from 'fs';

const files = [
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
  const content = fs.readFileSync(f, 'utf8');
  const alts = [];
  const altRegex = /alt="([^"]+)"/g;
  let m;
  while ((m = altRegex.exec(content)) !== null) {
    alts.push(m[1]);
  }
  if (alts.length > 0) {
    console.log(f.split('/').slice(-2).join('/') + ': ' + alts.length + ' diagrams');
    alts.forEach((a, i) => console.log('  ' + (i+1) + ': ' + a.substring(0, 120)));
  } else {
    console.log(f.split('/').slice(-2).join('/') + ': NO diagrams found');
  }
}