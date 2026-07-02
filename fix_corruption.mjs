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

// Use uFFFD escape to avoid encoding issues in the script itself
const REPL = '�'; // U+FFFD replacement character
const REPL_REGEX = /�/g;

// ==========================================
// TEXT FIXER
// ==========================================

function fixTextContent(str) {
  // Pattern 1: "word [U+FFFD] word" -> "word — word" (em dash)
  str = str.replace(/([a-zA-Z0-9\)\]]) � ([a-zA-Z])/g, '$1 — $2');

  // Pattern 2: " [U+FFFD] " (isolated between spaces) -> " — "
  str = str.replace(/ � /g, ' — ');

  // Pattern 3: " [U+FFFD]word" (replacement before word, no space after)
  str = str.replace(/ �([a-zA-Z])/g, ' — $1');

  // Pattern 4: "word[U+FFFD] " (replacement after word, no space before)
  str = str.replace(/([a-zA-Z0-9)])� /g, '$1 — ');

  // Pattern 5: "word[U+FFFD]word" (no spaces at all)
  str = str.replace(/([a-z])�([a-z])/gi, '$1 — $2');

  // Pattern 6: remaining [U+FFFD] at line start or after newline (likely diagram corruption)
  str = str.replace(/^�/gm, '');
  str = str.replace(/^ �/gm, '');
  str = str.replace(/^  �/gm, '');
  str = str.replace(/^   �/gm, '');

  // Pattern 7: Any remaining [U+FFFD] in the text (remove these)
  // These are in diagram content and can't be automatically recovered
  str = str.replace(/�/g, '');

  return str;
}

// ==========================================
// MAIN
// ==========================================

const log = [];
let totalFixed = 0;
let totalRemaining = 0;

for (const relPath of FILES) {
  const fullPath = path.resolve(relPath);
  const originalStr = fs.readFileSync(fullPath, 'utf8');

  const replMatches = originalStr.match(REPL_REGEX);
  const replCount = replMatches ? replMatches.length : 0;

  if (replCount === 0) {
    console.log(`  CLEAN: ${relPath}`);
    log.push({ file: relPath, status: 'CLEAN', replacements: 0 });
    continue;
  }

  console.log(`\nProcessing: ${relPath} (${replCount} replacement chars)`);

  // Apply text fixes
  let fixed = fixTextContent(originalStr);

  // Check remaining replacements
  const remainingMatches = fixed.match(REPL_REGEX);
  const remainingCount = remainingMatches ? remainingMatches.length : 0;
  const fixedCount = replCount - remainingCount;

  totalFixed += fixedCount;
  totalRemaining += remainingCount;

  // Log what was fixed
  console.log(`  Fixed ${fixedCount} em dashes (${replCount} -> ${remainingCount} remaining)`);

  // Write the fixed file
  fs.writeFileSync(fullPath, fixed, 'utf8');

  log.push({
    file: relPath,
    status: remainingCount === 0 ? 'FULLY_FIXED' : 'PARTIALLY_FIXED',
    replacementsFixed: fixedCount,
    replacementsRemaining: remainingCount
  });
}

// Save JSON report
const reportPath = path.resolve('corruption-fix-report.json');
fs.writeFileSync(reportPath, JSON.stringify(log, null, 2));
console.log(`\n=== Summary ===`);
console.log(`Total fixed: ${totalFixed} characters`);
console.log(`Total remaining: ${totalRemaining} characters`);
console.log(`Report saved to ${reportPath}`);