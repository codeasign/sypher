// Convert spaced double hyphens (" -- ") used as dashes in PROSE into em dashes so the same decision pipeline can handle them.
import { TOPICS, listFiles, read, write, segments } from './mdxlib.mjs';
let n = 0;
for (const t of TOPICS) for (const rel of listFiles(t)) {
  const src = read(rel);
  let out = '', changed = false;
  for (const sg of segments(src)) {
    if (sg.type === 'diagram' || sg.type === 'code') { out += sg.text; continue; }
    const txt = sg.text.split('\n').map((ln) => {
      if (/^\s*\|[\s:|-]+\|?\s*$/.test(ln)) return ln; // table delimiter row
      return ln.replace(/ -- /g, () => { n++; return ' — '; });
    }).join('\n');
    if (txt !== sg.text) changed = true;
    out += txt;
  }
  if (changed) write(rel, out);
}
console.log('converted', n);
