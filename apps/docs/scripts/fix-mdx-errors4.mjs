import fs from 'fs';

// Fix api-security/07-challenge.mdx - wrap GraphQL examples in code blocks
let c = fs.readFileSync('docs/system-design-fundamentals/api-security/07-challenge.mdx', 'utf8');
let lines = c.split('\n');
let result = [];
let inCodeBlock = false;
let inGraphQL = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  const prevLine = i > 0 ? lines[i-1].trim() : '';
  const nextLine = i < lines.length - 1 ? lines[i+1].trim() : '';

  // Track code blocks
  if (trimmed.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    result.push(line);
    continue;
  }
  if (inCodeBlock) {
    result.push(line);
    continue;
  }

  // Check if this line looks like GraphQL with bare braces
  const hasBareBrace = (trimmed === 'type Query {' || trimmed === 'type Mutation {' ||
    (trimmed.startsWith('type') && trimmed.endsWith('{')) ||
    (trimmed.startsWith('query') && trimmed.endsWith('{')) ||
    (trimmed.match(/^(query|mutation|fragment|subscription)\s/)) ||
    (trimmed.includes('{') && trimmed.includes('ID!') || trimmed.includes('!]') || trimmed.includes('@auth')) ||
    (trimmed === 'type User {'));

  if (hasBareBrace && !inGraphQL && !inCodeBlock) {
    // Start a GraphQL code block
    result.push('```graphql');
    result.push(line);
    inGraphQL = true;
    continue;
  }

  if (inGraphQL) {
    // Check if this line ends the GraphQL block
    if (trimmed === '') {
      // Empty line might be inside GraphQL or the end
      // Check if next line is also GraphQL
      if (nextLine && (nextLine.trim().startsWith('type') || nextLine.trim().startsWith('query') || nextLine.trim().startsWith('query {'))) {
        result.push(line);
        continue;
      }
      // Close the GraphQL block
      result.push('```');
      result.push(line);
      inGraphQL = false;
      continue;
    }
    if (trimmed.startsWith('```') || trimmed.startsWith('#')) {
      result.push('```');
      result.push(line);
      inGraphQL = false;
      continue;
    }
    result.push(line);
    continue;
  }

  result.push(line);
}

// Close any open GraphQL block
if (inGraphQL) {
  result.push('```');
}

fs.writeFileSync('docs/system-design-fundamentals/api-security/07-challenge.mdx', result.join('\n'), 'utf8');
console.log('Fixed api-security/07-challenge.mdx');

// Now check for secrets-management/07-challenge.mdx
c = fs.readFileSync('docs/system-design-fundamentals/secrets-management/07-challenge.mdx', 'utf8');
// Check for the quote issue - find the specific line causing the error
lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Look for lines with < and =" that are NOT AsciiDiagram or details/summary
  if (lines[i].includes('<') && lines[i].includes('="') &&
      !lines[i].includes('<AsciiDiagram') && !lines[i].includes('<details') &&
      !lines[i].includes('<summary') && !lines[i].includes('</')) {
    console.log('L' + (i+1) + ': ' + lines[i].trim().substring(0, 120));
  }
}