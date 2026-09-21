// usage: node extract.mjs <topic> [--pending-only]  -> writes work/<topic>.txt and prints summary
import fs from 'node:fs';
import path from 'node:path';
const REPO = 'D:/jenny/sypher';
const SP = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const topic = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(`${REPO}/apps/docs/diagram-manifests/system-design-fundamentals.json`, 'utf8'));
const cls = fs.existsSync(`${SP}/classify.json`) ? JSON.parse(fs.readFileSync(`${SP}/classify.json`, 'utf8')) : [];
const clsById = new Map(cls.map((c) => [c.id, c]));

const entries = manifest.diagrams.filter((d) => d.file.includes(`/system-design-fundamentals/${topic}/`) && !d.converted);
const byFile = new Map();
for (const e of entries) { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(e); }

function tagsOf(src) {
  const out = []; const OPEN = '<AsciiDiagram'; let i = 0;
  while (true) {
    const s = src.indexOf(OPEN, i); if (s === -1) break;
    let j = s + OPEN.length, depth = 0, inB = false, end = -1;
    while (j < src.length) {
      const c = src[j];
      if (inB) { if (c === '\\') { j += 2; continue; } if (c === '`') inB = false; j++; continue; }
      if (c === '`') { inB = true; j++; continue; }
      if (c === '{') depth++; else if (c === '}') depth--;
      else if (c === '/' && src[j + 1] === '>' && depth === 0) { end = j + 2; break; }
      j++;
    }
    if (end === -1) break;
    out.push(src.slice(s, end)); i = end;
  }
  return out;
}

let text = '';
let n = 0;
for (const [file, list] of byFile) {
  const src = fs.readFileSync(`${REPO}/${file}`, 'utf8');
  const tags = tagsOf(src);
  for (const e of list) {
    const tag = tags[e.diagramIndex - 1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const title = /\btitle="([^"]*)"/.exec(tag)?.[1] ?? '';
    const m = /content=\{\s*`([\s\S]*?)`\s*\}/.exec(tag);
    const content = m ? m[1] : '<<NO CONTENT>>';
    const c = clsById.get(e.id);
    const lines = content.split('\n'); const maxw = Math.max(...lines.map((l) => l.length));
    text += `\n######## ${path.basename(e.mmdFile, '.mmd')} | id=${e.id.replace('system-design-fundamentals/', '')} | ${title} | type=${c ? c.recommendedType + '/' + c.confidence : '?'} | ${lines.length}x${maxw}\n${content}\n`;
    n++;
  }
}
fs.mkdirSync(`${SP}/work`, { recursive: true });
fs.writeFileSync(`${SP}/work/${topic}.txt`, text);
console.log(topic, n, 'diagrams', text.length, 'chars');
