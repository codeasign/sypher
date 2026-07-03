const fs = require('fs');
const path = require('path');

const topics = ['disaster-recovery'];
const base = 'docs/system-design-fundamentals';

const BT = String.fromCharCode(96); // backtick

for (const topic of topics) {
  const dir = path.join(base, topic);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

  for (const file of files) {
    const fpath = path.join(dir, file);
    let content = fs.readFileSync(fpath, 'utf-8');

    // Fix 1: Opening pattern
    const openRe = new RegExp(
      '(<AsciiDiagram[^>]*?)>\\s*\\n\\s*\\{' + BT,
      'g'
    );
    content = content.replace(openRe, '$1  content={' + BT);

    // Fix 2: Closing pattern — multi-line form
    const closeRe1 = new RegExp(
      BT + '\\s*\\}\\s*\\n\\s*<\\/AsciiDiagram>',
      'g'
    );
    content = content.replace(closeRe1, BT + '} />');

    // Fix 3: Closing pattern — single-line form: `}</AsciiDiagram>
    const closeRe2 = new RegExp(
      BT + '\\s*\\}\\s*<\\/AsciiDiagram>',
      'g'
    );
    content = content.replace(closeRe2, BT + '} />');

    fs.writeFileSync(fpath, content, 'utf-8');
    console.log(`Fixed: ${file} in ${topic}`);
  }
}

console.log('Done!');
