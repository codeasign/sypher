// Ported verbatim from apps/docs/src/components/CoreEditor/Index.tsx's
// composeSourceCode + its helpers (2026-09-17 Practice Coding migration) —
// this is hard-won per-language harness/student-code composition logic
// (Go package/import hoisting, C/C++ leading-struct hoisting, Python 3.8
// PEP 585 fix), not something to re-derive. See the original file's
// comments for the empirical reasoning behind each rule.

interface SplitSource {
  preamble: string;
  body: string;
}

function consumeGoImportBlock(lines: string[], startIdx: number, preambleLines: string[]): number {
  let i = startIdx;
  while (i < lines.length) {
    preambleLines.push(lines[i]);
    const isEnd = lines[i].trim().endsWith(')');
    i++;
    if (isEnd) break;
  }
  return i;
}

function extractPreamble(source: string): SplitSource {
  const lines = source.split('\n');
  let i = 0;

  if (/^package\s+\w+\s*$/.test(lines[0] ?? '')) {
    const preambleLines = [lines[0]];
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (/^import\s*\(/.test(lines[i] ?? '')) {
      i = consumeGoImportBlock(lines, i, preambleLines);
    } else if (/^import\s+"/.test(lines[i] ?? '')) {
      preambleLines.push(lines[i]);
      i++;
    }
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }

  if (/^import\s*\(/.test(lines[0] ?? '')) {
    const preambleLines: string[] = [];
    i = consumeGoImportBlock(lines, 0, preambleLines);
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }

  const isDirective = (line: string) => /^\s*(import\s|using\s|#include\b)/.test(line);
  const preambleLines: string[] = [];
  while (i < lines.length && (isDirective(lines[i]) || lines[i].trim() === '')) {
    if (isDirective(lines[i])) preambleLines.push(lines[i]);
    i++;
  }
  return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
}

function parseGoPreamble(preamble: string): { packageLine: string; imports: string[] } {
  const lines = preamble.split('\n');
  const packageLine = lines.find((line) => /^package\s+\w+/.test(line)) ?? '';
  const imports: string[] = [];
  for (const line of lines) {
    const single = line.match(/^import\s+"([^"]+)"/);
    if (single) { imports.push(single[1]); continue; }
    const grouped = line.match(/^import\s*\(([^)]*)\)/);
    if (grouped) {
      const quoted = grouped[1].match(/"([^"]+)"/g) ?? [];
      for (const q of quoted) imports.push(q.slice(1, -1));
      continue;
    }
    const blockEntry = line.match(/^\s*"([^"]+)"\s*$/);
    if (blockEntry) imports.push(blockEntry[1]);
  }
  return { packageLine, imports };
}

function composeGoPreamble(hPreamble: string, cPreamble: string): string {
  const h = parseGoPreamble(hPreamble);
  const c = parseGoPreamble(cPreamble);
  const packageLine = h.packageLine || c.packageLine;
  const imports = Array.from(new Set([...h.imports, ...c.imports]));
  const importBlock = imports.length === 0
    ? ''
    : imports.length === 1
      ? `import "${imports[0]}"`
      : `import (\n${imports.map((p) => `    "${p}"`).join('\n')}\n)`;
  return [packageLine, importBlock].filter((p) => p !== '').join('\n');
}

function extractLeadingDataStruct(harnessBody: string, studentBody: string): SplitSource | null {
  const lines = harnessBody.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  const typedefMatch = /^typedef\s+struct\s*\{?\s*$/.test(lines[i] ?? '') || /^typedef\s+struct\s*\{/.test(lines[i] ?? '');
  const namedMatch = /^struct\s+(\w+)\s*\{/.test(lines[i] ?? '');
  if (!typedefMatch && !namedMatch) return null;

  const startLine = i;
  let depth = 0;
  let sawOpenBrace = false;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; sawOpenBrace = true; }
      else if (ch === '}') depth--;
    }
    if (sawOpenBrace && depth === 0) break;
  }
  if (!sawOpenBrace || depth !== 0) return null;

  let endLine = i;
  if (typedefMatch && !/\}\s*\w+\s*;\s*$/.test(lines[endLine])) {
    if (endLine + 1 < lines.length && /^\s*\w+\s*;\s*$/.test(lines[endLine + 1])) endLine++;
  }
  const fullStructText = lines.slice(startLine, endLine + 1).join('\n');

  if (/\b(public|private|protected)\s*:/.test(fullStructText)) return null;

  const nameMatch = fullStructText.match(/^struct\s+(\w+)/) ?? fullStructText.match(/\}\s*(\w+)\s*;\s*$/);
  const typeName = nameMatch?.[1];
  if (typeName && new RegExp(`\\b(class|struct)\\s+${typeName}\\s*\\{`).test(studentBody)) {
    return null;
  }

  const rest = lines.slice(endLine + 1).join('\n');
  return { preamble: fullStructText, body: rest };
}

export function composeSourceCode(harness: string, code: string, language?: string): string {
  const h = extractPreamble(harness);
  const c = extractPreamble(code);
  const isGo = /^package\s+\w+/.test(h.preamble) || /^package\s+\w+/.test(c.preamble);
  const preamble = isGo ? composeGoPreamble(h.preamble, c.preamble) : [h.preamble, c.preamble].filter((p) => p.trim() !== '').join('\n\n');

  const hoisted = extractLeadingDataStruct(h.body, c.body);
  const dataStructPreamble = hoisted?.preamble ?? '';
  const harnessBody = hoisted?.body ?? h.body;

  const composed = [preamble, dataStructPreamble, c.body, harnessBody].filter((p) => p.trim() !== '').join('\n\n');

  if (language === 'python') {
    return `from __future__ import annotations\n${composed}`;
  }

  return composed;
}
