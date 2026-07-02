import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = 'D:/jenny/sypher/docs/system-design-fundamentals/http2-and-http3';
const FILES = ['01-concepts.mdx', '02-deep-dive.mdx', '03-architecture.mdx', '05-real-world.mdx'];

function fixCorruption(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let result = [];

  for (let line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      line = fixLine(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

function fixLine(s) {
  // Step 1: Replace long runs of corruption with horizontal lines
  // These are the long runs of --?,--?,--? etc. (any length >= 2)
  s = s.replace(/(--\?,--\?){2,}/g, match => {
    return '─'.repeat(Math.min(match.length, 80));
  });

  // Step 2: Isolated --?,--? pairs (2 segments)
  s = s.replace(/--\?,--\?/g, '───');

  // Step 3: Replace --??s with │ (vertical line marker)
  s = s.replace(/--\?\?s/g, ' │ ');

  // Step 4: Replace --??T with ──▶ (arrow)
  s = s.replace(/--\?\?T/g, '──▶ ');

  // Step 5: --?"¶ → ────▶ (long arrow)
  s = s.replace(/--\?"¶/g, '────▶');

  // Step 6: --?"¼ → │ (vertical line)
  s = s.replace(/--\?"¼/g, '│');

  // Step 7: --?"² → │ (vertical)
  s = s.replace(/--\?"²/g, '│');

  // Step 8: End markers --??--?o → ────┘
  s = s.replace(/--\?\?\?o/g, '─┘');
  s = s.replace(/--\?\?o/g, '───┘');

  // Step 9: --?"--?→ └──
  s = s.replace(/--\?"--\?/g, '└──');

  // Step 10: --?'--?´ → ├──┤
  s = s.replace(/--\?'--\?´/g, '├──┤');

  // Step 11: --?' → ├  (T-junction from left)
  s = s.replace(/--\?'/g, '├─');

  // Step 12: Remaining --?" → └─ (corner)
  // Be careful not to match already-fixed patterns
  s = s.replace(/--\?"/g, '└─');

  // Step 13: --??--? → ──▶ (arrow with line)
  s = s.replace(/--\?\?\?\?\?/g, '─────');
  s = s.replace(/--\?\?\?\?/g, '────');
  s = s.replace(/--\?\?\?/g, '───');
  s = s.replace(/--\?\?/g, '───');

  // Step 14: Remaining --? → ─ (single segment)
  // But only if followed by space or end of line (not part of text)
  s = s.replace(/--\?(?=[ \.\]\)])/g, '───');
  s = s.replace(/--\?(?=\w)/g, '──▶ ');

  // Step 15: Remaining isolated ? → ─ (corruption marker)
  // But only in diagram context (surrounded by box-drawing chars or spaces)
  // Replace ? that are between box-drawing unicode chars
  s = s.replace(/([─│└├┘┤┬┴┼☐▶◀])\?([─│└├┘┤┬┴┼☐▶◀])/g, '$1─$2');

  // Replace ? between space and box-drawing
  s = s.replace(/ \?([─│└├┘┤┬┴┼])/g, ' ─$1');
  s = s.replace(/([─│└├┘┤┬┴┼])\? /g, '$1─ ');
  s = s.replace(/ \? /g, ' ─ ');

  // Step 16: Clean up multiple consecutive ││
  s = s.replace(/│\s*│/g, '│ │');

  // Step 17: Fix --@ pattern (if any)
  s = s.replace(/--@/g, '──▶');

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
  console.log(`${file}: ${remaining} lines still corrupted`);

  // Show a sample of any remaining corruption
  if (remaining > 0) {
    let shown = 0;
    for (const line of newLines) {
      if (/--\?/.test(line) && shown < 3) {
        console.log('  REMAINING: ' + line.trim().substring(0, 90));
        shown++;
      }
    }
  }
}

console.log('\nDone.');