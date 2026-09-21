// usage: node rr.mjs <topic/file.mdx> <startMarker> <endMarker> <newTextFile> [--dry]
// Replaces text from startMarker (inclusive) up to endMarker (exclusive). Both markers must be unique. Refuses diagram overlap.
import fs from 'node:fs';
import { read, write, diagramSpans } from './mdxlib.mjs';
const [file, sm, em, nf] = process.argv.slice(2);
const DRY = process.argv.includes('--dry');
let s = read(file);
const neu = fs.readFileSync(nf, 'utf8').replace(/\r\n/g, '\n');
const a = s.indexOf(sm);
if (a < 0 || s.indexOf(sm, a + 1) >= 0) { console.log('start marker not unique/found'); process.exit(1); }
const b = s.indexOf(em, a + sm.length);
if (b < 0) { console.log('end marker not found'); process.exit(1); }
if (diagramSpans(s).some(([x, y]) => a < y && b > x)) { console.log('overlaps diagram'); process.exit(1); }
console.log('replacing', b - a, 'chars');
if (!DRY) write(file, s.slice(0, a) + neu + s.slice(b));
