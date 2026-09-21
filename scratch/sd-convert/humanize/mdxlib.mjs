import fs from 'node:fs';
export const ROOT = 'D:/jenny/sypher/apps/docs/docs/system-design-fundamentals/';
export const TOPICS = 'vertical-scaling horizontal-scaling stateless-vs-stateful replication sharding consistent-hashing cap-theorem distributed-counters distributed-ids leader-election pacelc consensus raft distributed-locks vector-clocks gossip-protocol split-brain'.split(' ');

// Backtick-aware <AsciiDiagram ...> span finder (same rule the importer uses, plus escaped chars).
export function diagramSpans(source) {
  const spans = [];
  let i = 0;
  while (true) {
    const start = source.indexOf('<AsciiDiagram', i);
    if (start === -1) break;
    let j = start, inB = false, end = -1;
    while (j < source.length) {
      const ch = source[j];
      if (inB && ch === '\\') { j += 2; continue; }
      if (ch === '`') { inB = !inB; j++; continue; }
      if (!inB && ch === '/' && source[j + 1] === '>') { end = j + 2; break; }
      if (!inB && source.startsWith('</AsciiDiagram>', j)) { end = j + 15; break; }
      j++;
    }
    if (end === -1) throw new Error('unterminated AsciiDiagram at ' + start);
    spans.push([start, end]);
    i = end;
  }
  return spans;
}

// Splits into segments: front (frontmatter), diagram, code (fenced), prose.
export function segments(source) {
  const dspans = diagramSpans(source);
  const out = [];
  let pos = 0;
  const pushProse = (a, b) => {
    if (b <= a) return;
    const text = source.slice(a, b);
    // split fenced code blocks
    const re = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ type: 'prose', start: a + last, end: a + m.index, text: text.slice(last, m.index) });
      out.push({ type: 'code', start: a + m.index, end: a + m.index + m[0].length, text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: 'prose', start: a + last, end: b, text: text.slice(last) });
  };
  for (const [s, e] of dspans) {
    pushProse(pos, s);
    out.push({ type: 'diagram', start: s, end: e, text: source.slice(s, e) });
    pos = e;
  }
  pushProse(pos, source.length);
  // mark frontmatter
  if (out.length && source.startsWith('---')) {
    const fe = source.indexOf('\n---', 3);
    if (fe !== -1 && out[0].type === 'prose') {
      const cut = fe + 4;
      const first = out[0];
      out.splice(0, 1, { type: 'front', start: 0, end: cut, text: source.slice(0, cut) }, { type: 'prose', start: cut, end: first.end, text: source.slice(cut, first.end) });
    }
  }
  return out;
}

export function listFiles(topic) {
  return fs.readdirSync(ROOT + topic).filter((f) => /\.mdx?$/.test(f)).sort().map((f) => topic + '/' + f);
}
export const read = (rel) => fs.readFileSync(ROOT + rel, 'utf8');
export const write = (rel, s) => fs.writeFileSync(ROOT + rel, s, { encoding: 'utf8' });
