// Quote frontmatter scalar values that contain ": " (invalid unquoted YAML).
import { TOPICS, listFiles, read, write } from './mdxlib.mjs';
let n = 0;
for (const t of TOPICS) for (const rel of listFiles(t)) {
  const s = read(rel);
  const b = s.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (!s.startsWith('---', b)) continue;
  const end = s.indexOf('\n---', 3 + b);
  const fm = s.slice(0, end);
  const out = fm.split('\n').map((ln) => {
    const m = ln.match(/^([A-Za-z_]+):\s+(.*)$/);
    if (!m) return ln;
    const v = m[2];
    if (/^["'\[{|>]/.test(v)) return ln;
    if (v.includes(': ') || v.includes(' #')) { n++; return `${m[1]}: "${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }
    return ln;
  }).join('\n');
  if (out !== fm) write(rel, out + s.slice(end));
}
console.log('quoted', n);
