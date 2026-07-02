import fs from 'fs';

// Fix 1: api-security/03-architecture.mdx - restore escaped backticks inside template literals
// The issue: inline backticks inside AsciiDiagram template literals need to be escaped as \`
let c = fs.readFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', 'utf8');

// Strategy: find template literal boundaries and re-escape unescaped backticks inside them
let inTemplate = false;
let templateDepth = 0;
let result = '';

for (let i = 0; i < c.length; i++) {
  const ch = c[i];
  const prev = i > 0 ? c[i-1] : '';

  // Track template literal openings (content={`)
  if (!inTemplate && ch === '`' && i >= 9 && c.substring(i-9, i+1) === 'ntent={`') {
    inTemplate = true;
    result += ch;
    continue;
  }

  // Track template literal closing (`})
  if (inTemplate && ch === '`' && i+1 < c.length && c[i+1] === '}') {
    inTemplate = false;
    result += ch;
    continue;
  }

  // Inside template literal: escape backticks that aren't already escaped
  if (inTemplate && ch === '`' && prev !== '\\') {
    result += '\\`';
    continue;
  }

  result += ch;
}

fs.writeFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', result, 'utf8');
console.log('Fixed api-security/03-architecture: re-escaped template literal backticks');

// Fix 2: api-security/07-challenge.mdx - wrap JSON in code block
c = fs.readFileSync('docs/system-design-fundamentals/api-security/07-challenge.mdx', 'utf8');
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (i >= 891 && i <= 895) {
    console.log('api-security/07-challenge L' + (i+1) + ': ' + lines[i].trim().substring(0, 100));
  }
}

// Fix 3: secrets-management/07-challenge.mdx
c = fs.readFileSync('docs/system-design-fundamentals/secrets-management/07-challenge.mdx', 'utf8');
lines = c.split('\n');
console.log('\nsecrets-management/07-challenge L85-89:');
for (let i = 84; i < 89; i++) {
  console.log('  L' + (i+1) + ': ' + lines[i]);
}