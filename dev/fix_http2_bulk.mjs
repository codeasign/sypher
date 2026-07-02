import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = 'D:/jenny/sypher/docs/system-design-fundamentals/http2-and-http3';
const FILES = ['02-deep-dive.mdx', '03-architecture.mdx', '05-real-world.mdx'];

function fixContent(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let inAsciiContent = false;
  let result = [];

  for (let line of lines) {
    // Track code block boundaries
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    // Track AsciiDiagram content= boundaries
    if (/content=\{`/.test(line)) {
      inAsciiContent = true;
    }
    // Closing backtick on its own line or at end of AsciiDiagram
    if (inAsciiContent && /^\s*`\s*$/.test(line)) {
      inAsciiContent = false;
    }

    // Only fix inside code blocks or AsciiDiagram content
    if (inCodeBlock || inAsciiContent) {
      line = fixLine(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

function fixLine(s) {
  // Order matters: longer/more specific patterns first

  // Long horizontal runs: --?,--?,--? (repeating)
  s = s.replace(/(--\?,--\?){2,}/g, match => {
    return '─'.repeat(Math.min(match.length, 60));
  });

  // --??--?o -> end corner
  s = s.replace(/--\?\?--\?o/g, '───┘');

  // --??--? -> long arrow
  s = s.replace(/--\?\?--\?/g, '───▶');

  // --??s -> vertical line marker
  s = s.replace(/--\?\?s/g, ' │ ');

  // --??T -> arrow
  s = s.replace(/--\?\?T/g, '──▶ ');

  // --?"¶ -> arrow at end
  s = s.replace(/--\?"¶/g, '─────▶');

  // --?"¼ -> vertical down
  s = s.replace(/--\?"¼/g, '│');

  // --?"² -> vertical marker
  s = s.replace(/--\?"²/g, '│');

  // --?"--?¤ -> box corner
  s = s.replace(/--\?"--\?¤/g, '└──┘');

  // --?"--? -> corner
  s = s.replace(/--\?"--\?/g, '└───');

  // --?'--?´ -> T-junction
  s = s.replace(/--\?'--\?´/g, '├──┤');

  // --?' -> T-junction from left
  s = s.replace(/--\?'/g, '├─');

  // --?" -> corner (remaining)
  s = s.replace(/--\?"/g, '└─');

  // --??o -> end
  s = s.replace(/--\?\?o/g, '───┘');

  // --?o -> short end
  s = s.replace(/--\?o/g, '───┘');

  // --?¤ -> alt end
  s = s.replace(/--\?¤/g, '───┘');

  // --??? -> long horizontal
  s = s.replace(/--\?\?\?/g, '────');
  s = s.replace(/--\?\?/g, '───');

  // --? followed by space or end -> single segment
  s = s.replace(/--\?(?=\s|$)/g, '───');

  // --? followed by word char -> arrow
  s = s.replace(/--\?(?=\w)/g, '──▶ ');

  // Clean up remaining ? between box-drawing chars
  s = s.replace(/([─│└├┘┤┬┴┼▶◀])\?([─│└├┘┤┬┴┼▶◀])/g, '$1─$2');
  s = s.replace(/([─│└├┘┤┬┴┼▶◀])\? /g, '$1─ ');
  s = s.replace(/ \?([─│└├┘┤┬┴┼▶◀])/g, ' ─$1');

  // --,... patterns
  s = s.replace(/--,o/g, '───┘');
  s = s.replace(/--,--/g, '────');
  s = s.replace(/--,"/g, '───┘');
  s = s.replace(/--"o/g, '───┘');

  // stray --"
  s = s.replace(/--"/g, '───');

  // remaining ? in non-word context
  s = s.replace(/([^a-zA-Z0-9])\?([^a-zA-Z0-9])/g, '$1─$2');

  return s;
}

for (const file of FILES) {
  const fullPath = join(DIR, file);
  const content = readFileSync(fullPath, 'utf8');
  const fixed = fixContent(content);
  writeFileSync(fullPath, fixed);

  const newLines = fixed.split('\n');
  let remaining = 0;
  for (const line of newLines) {
    if (/--\?/.test(line)) remaining++;
  }
  console.log(`${file}: ${remaining} corrupted lines remaining`);
}

console.log('\nDone. Check remaining corruption above.');