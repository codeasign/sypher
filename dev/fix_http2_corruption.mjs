import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = 'D:/jenny/sypher/docs/system-design-fundamentals/http2-and-http3';
const FILES = ['01-concepts.mdx', '02-deep-dive.mdx', '03-architecture.mdx', '05-real-world.mdx'];

function fixCorruption(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let result = [];

  for (let line of lines) {
    // Track code block boundaries
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      // Fix the corrupted patterns
      line = fixLine(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

function fixLine(line) {
  let s = line;

  // Order matters: apply longer patterns first

  // Pattern 1: Long horizontal runs of corruption ───────────────
  // These are long runs of --?,--? that represent multi-segment horizontal lines
  // Replace longest runs first
  s = s.replace(/--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?,--\?/g, '─'.repeat(56));

  // Generic: replace runs of --?,--? with horizontal lines
  // Match: --?,--?,--? (any length >= 3)
  s = s.replace(/(--\?,--\?){2,}/g, match => {
    const count = (match.length / 5); // each --?, is 5 chars
    return '─'.repeat(count);
  });

  // Pattern 2: --? on its own (single)
  s = s.replace(/--\?/g, '─');

  // Pattern 3: --??s (vertical line markers)
  s = s.replace(/--\?\?s/g, ' │ ');

  // Pattern 4: --??T (arrow indicators)
  s = s.replace(/--\?\?T/g, '──▶ ');

  // Pattern 5: --?"¶ (arrows at end of lines)
  s = s.replace(/--\?"¶/g, '────▶');

  // Pattern 6: --?"¼ (vertical line going down)
  s = s.replace(/--\?"¼/g, '│');

  // Pattern 7: --?"² (vertical marker)
  s = s.replace(/--\?"²/g, '│');

  // Pattern 8: --?"--? sequences (corners and tees)
  // --?"--?¤ (bottom-right corner)
  s = s.replace(/--\?"--\?¤/g, '└─┘');
  // --?"--?--?" sequences
  s = s.replace(/--\?"--\?--\?"/g, '└───┐');
  // --?'--?´ (T-junction top)
  s = s.replace(/--\?'--\?´/g, '├──┤');
  // --??--?o (end corner)
  s = s.replace(/--\?\?--\?o/g, '───┘');
  s = s.replace(/--\?\?--\?/g, '───▶');

  // Pattern 9: --?' (T-junction)
  s = s.replace(/--\?'/g, '├─');

  // Pattern 10: --?" (corner)
  s = s.replace(/--\?"/g, '└─');

  // Pattern 11: --??--? (long arrow)
  s = s.replace(/--\?\?\?/g, '───');
  s = s.replace(/--\?\?/g, '───');

  // Pattern 12: Clean up remaining common markers
  s = s.replace(/--@/g, '──▶');
  s = s.replace(/--o/g, '──┘');
  s = s.replace(/--\?o/g, '───┘');
  s = s.replace(/--\?¤/g, '───┘');

  // Pattern 13: Single ? characters that are likely corruption
  // But be careful not to replace ? that are actual content
  // Replace ? that appear between two word characters
  // s = s.replace(/(\w)\?(\w)/g, '$1─$2');

  // Pattern 14: The --?...--?o pattern (end of box)
  s = s.replace(/--\?--\?--\?o/g, '───┘');

  return s;
}

for (const file of FILES) {
  const fullPath = join(DIR, file);
  const content = readFileSync(fullPath, 'utf8');
  const fixed = fixCorruption(content);
  writeFileSync(fullPath, fixed);

  const newLines = fixed.split('\n');
  let remaining = 0;
  for (const line of newLines) {
    if (/--\?[sT?,]/.test(line) || /\?[?]{2,}/.test(line)) remaining++;
  }
  console.log(`${file}: ${remaining} remaining corrupted lines`);
}

console.log('\nAll files processed. Check remaining corruption counts above.');