const fs = require('fs'), path = require('path');
const dirs = ['factory-method','abstract-factory','builder','prototype','singleton'];
let fixed = 0;
dirs.forEach(slug => {
  const root = 'docs/software-engineering/design-patterns/' + slug;
  fs.readdirSync(root, {withFileTypes: true}).forEach(e => {
    const p = path.join(root, e.name);
    if (e.name.endsWith('.mdx')) {
      let c = fs.readFileSync(p, 'utf8');
      const o = c;
      c = c.replace(
        /(<AsciiDiagram\s+[^>]*?)(\s+content=\{)([\s\S]*?)(`\}\s*"\s*alt="([^"]*)"\s*caption="([^"]*)"\s*\/>)/g,
        (_, b, cs, dc, cl, alt, cap) =>
          b + ' alt="' + alt + '" caption="' + cap + '"' + cs + dc + '`} />'
      );
      if (c !== o) { fs.writeFileSync(p, c, 'utf8'); console.log('Fixed A5: ' + p); fixed++; }
    }
  });
});
if (fixed === 0) console.log('No A5 defects found across all 5 patterns.');