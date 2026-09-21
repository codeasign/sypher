// usage: node patch.mjs <patchfile> [--dry]
// patch format:
//   @@ topic/file.mdx
//   <<<<
//   old text (may be multi-line)
//   ====
//   new text
//   >>>>
// old must occur exactly once in the file and must not overlap an <AsciiDiagram> span.
import fs from 'node:fs';
import { read, write, diagramSpans } from './mdxlib.mjs';
const DRY = process.argv.includes('--dry');
const txt = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const files = new Map();
let cur = null, mode = null, oldBuf = [], newBuf = [];
const ops = [];
for (const line of txt.split('\n')) {
  if (mode === null) {
    if (line.startsWith('@@ ')) cur = line.slice(3).trim();
    else if (line === '<<<<') { mode = 'old'; oldBuf = []; newBuf = []; }
    continue;
  }
  if (mode === 'old') { if (line === '====') mode = 'new'; else oldBuf.push(line); continue; }
  if (mode === 'new') { if (line === '>>>>') { ops.push({ file: cur, old: oldBuf.join('\n'), neu: newBuf.join('\n') }); mode = null; } else newBuf.push(line); }
}
let ok = 0; const bad = [];
for (const op of ops) {
  let s = files.get(op.file);
  if (s === undefined) s = read(op.file);
  const first = s.indexOf(op.old);
  const cnt = first === -1 ? 0 : s.split(op.old).length - 1;
  if (cnt !== 1) { bad.push(`${op.file}: found ${cnt}x: ${op.old.slice(0, 70).replace(/\n/g, ' ')}`); continue; }
  const spans = diagramSpans(s);
  if (spans.some(([a, b]) => first < b && first + op.old.length > a)) { bad.push(`${op.file}: overlaps diagram: ${op.old.slice(0, 60)}`); continue; }
  s = s.slice(0, first) + op.neu + s.slice(first + op.old.length);
  files.set(op.file, s); ok++;
}
if (!DRY) for (const [f, s] of files) write(f, s);
console.log({ ops: ops.length, applied: ok, failed: bad.length, dry: DRY });
for (const b of bad) console.log('FAIL', b);
