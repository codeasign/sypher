const fs = require('fs');
const VAR = ['What makes it better: ', 'This is better because ', 'That change matters because ', 'It works because ', 'The gain here: '];
for (const s of process.argv.slice(2)) {
  const f = __dirname + '/' + s + '.txt';
  let t = fs.readFileSync(f, 'utf8');
  let i = 0;
  t = t.replace(/What makes it better: (\w)/g, (m, c) => {
    const v = VAR[i++ % VAR.length];
    return v + (v.endsWith(': ') && v.startsWith('What') ? c : c.toLowerCase());
  });
  fs.writeFileSync(f, t);
  console.log(s, 'replaced', i);
}
