// usage: node pview.mjs <topic/file.mdx> [maxLines]  -> prose view with diagrams elided; line numbers are of the compacted view
import { read, segments } from './mdxlib.mjs';
const [rel, maxArg, offArg] = process.argv.slice(2);
const src = read(rel);
const segs = segments(src);
let out = '';
for (const s of segs) {
  if (s.type === 'diagram') {
    const id = (s.text.match(/\bid="([^"]+)"/) || [])[1] || '?';
    out += `\n[[DIAGRAM ${id}]]\n`;
  } else out += s.text;
}
const lines = out.split('\n');
const off = Number(offArg || 0), max = Number(maxArg || 100000);
console.log(lines.slice(off, off + max).map((l, i) => `${off + i + 1}: ${l}`).join('\n'));
if (off + max < lines.length) console.log(`... (${lines.length - off - max} more lines)`);
