const fs = require('fs');
const path = require('path');

const bt = String.fromCharCode(96);
const topics = ['disaster-recovery'];
const base = 'docs/system-design-fundamentals';

for (const topic of topics) {
  const dir = path.join(base, topic);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
  for (const file of files) {
    const fpath = path.join(dir, file);
    let content = fs.readFileSync(fpath, 'utf-8');

    // Fix single-line opening: >{` -> content={`
    // This handles: alt="...">{`
    const re = new RegExp('>' + '\\{' + bt, 'g');
    content = content.replace(re, ' content={' + bt);

    // Also fix multi-line opening (just in case):
    // >\n{`
    const re2 = new RegExp('>\\s*\\n\\s*\\{' + bt, 'g');
    content = content.replace(re2, ' content={' + bt);

    fs.writeFileSync(fpath, content, 'utf-8');
    console.log('Fixed: ' + file + ' in ' + topic);
  }
}
console.log('Done');