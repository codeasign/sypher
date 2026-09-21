import fs from 'node:fs';
let s = fs.readFileSync('split.mjs', 'utf8');
s = s.replace("  const nodes = rows.map(([t, b, a], i) => {\n    const box", "  const raw = rows.map((r) => r[0].startsWith('@SRC '));\n  const nodes = rows.map(([t, b, a], i) => {\n    if (raw[i]) return t;\n    const box");
s = s.replace("for (let i = r * per + 1; i < Math.min(rows.length, r * per + per); i++) out += '  ' + id + (i - 1) + ' --> ' + id + i + NL;", "for (let i = r * per + 1; i < Math.min(rows.length, r * per + per); i++) if (!raw[i] && !raw[i - 1]) out += '  ' + id + (i - 1) + ' --> ' + id + i + NL;");
fs.writeFileSync('split.mjs', s);
