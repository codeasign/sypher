// Verifies every <AsciiDiagram> span is byte-identical to the committed (HEAD) version, file by file.
import { execSync } from 'node:child_process';
import { TOPICS, listFiles, read, diagramSpans } from './mdxlib.mjs';
let files = 0, spans = 0, bad = 0, changedFiles = 0;
const only = process.argv[2];
for (const t of TOPICS) {
  if (only && t !== only) continue;
  for (const rel of listFiles(t)) {
    files++;
    const cur = read(rel);
    const head = execSync(`git show HEAD:apps/docs/docs/system-design-fundamentals/${rel}`, { cwd: 'D:/jenny/sypher', maxBuffer: 1 << 28 }).toString('utf8');
    if (cur !== head) changedFiles++;
    const a = diagramSpans(cur).map(([s, e]) => cur.slice(s, e));
    const b = diagramSpans(head).map(([s, e]) => head.slice(s, e));
    spans += a.length;
    if (a.length !== b.length) { bad++; console.log('COUNT DIFF', rel, a.length, b.length); continue; }
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { bad++; console.log('DIAGRAM CHANGED', rel, i); }
  }
}
console.log({ files, changedFiles, diagramSpans: spans, diagramViolations: bad });
