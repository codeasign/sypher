export type FormatAction = 'bold' | 'italic' | 'underline' | 'orderedList' | 'bulletList' | 'code';

export interface FormatResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const BULLET_RE = /^\s*[-*+]\s+/;
const ORDERED_RE = /^\s*\d+[.)]\s+/;

/**
 * Wrap the selection in open/close markers, or strip them when the
 * selection is already wrapped (toggle). Edge whitespace is kept outside
 * the markers — "**word **" is not bold in Markdown.
 */
function toggleInline(
  value: string,
  start: number,
  end: number,
  open: string,
  close: string,
  placeholder: string,
): FormatResult {
  while (start < end && /\s/.test(value[start])) start += 1;
  while (end > start && /\s/.test(value[end - 1])) end -= 1;

  const selected = value.slice(start, end);

  // Markers sit just outside the selection → unwrap them.
  if (value.slice(start - open.length, start) === open && value.slice(end, end + close.length) === close) {
    const next = value.slice(0, start - open.length) + selected + value.slice(end + close.length);
    return { value: next, selectionStart: start - open.length, selectionEnd: end - open.length };
  }
  // Markers are part of the selection → unwrap them.
  if (selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)) {
    const inner = selected.slice(open.length, selected.length - close.length);
    return { value: value.slice(0, start) + inner + value.slice(end), selectionStart: start, selectionEnd: start + inner.length };
  }

  const body = selected || placeholder;
  const next = value.slice(0, start) + open + body + close + value.slice(end);
  const bodyStart = start + open.length;
  return { value: next, selectionStart: bodyStart, selectionEnd: bodyStart + body.length };
}

/** Inline `code` for a single line, a fenced block once the selection spans lines. */
function toggleCode(value: string, start: number, end: number): FormatResult {
  const selected = value.slice(start, end);
  if (!selected.includes('\n')) {
    // A longer fence lets the selection itself contain backticks.
    const longestRun = Math.max(0, ...(selected.match(/`+/g) ?? []).map((run) => run.length));
    const tick = '`'.repeat(longestRun + 1);
    return toggleInline(value, start, end, tick, tick, 'code');
  }

  const fence = '```';
  const trimmed = selected.replace(/^\n+|\n+$/g, '');
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before.length === 0 || before.endsWith('\n') ? '' : '\n';
  const trail = after.length === 0 || after.startsWith('\n') ? '' : '\n';
  const block = `${lead}${fence}\n${trimmed}\n${fence}${trail}`;
  const bodyStart = before.length + lead.length + fence.length + 1;
  return { value: before + block + after, selectionStart: bodyStart, selectionEnd: bodyStart + trimmed.length };
}

/** Bullet / numbered list over every line the selection touches; toggles off when all lines already match. */
function toggleList(value: string, start: number, end: number, ordered: boolean): FormatResult {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newlineAfter = value.indexOf('\n', end);
  const lineEnd = newlineAfter === -1 ? value.length : newlineAfter;

  const lines = value.slice(lineStart, lineEnd).split('\n');
  const marker = ordered ? ORDERED_RE : BULLET_RE;
  const filled = lines.filter((line) => line.trim().length > 0);
  const alreadyList = filled.length > 0 && filled.every((line) => marker.test(line));

  let counter = 0;
  const rewritten = lines.map((line) => {
    if (line.trim().length === 0 && lines.length > 1) return line;
    const bare = line.replace(ORDERED_RE, '').replace(BULLET_RE, '');
    if (alreadyList) return bare;
    counter += 1;
    return `${ordered ? `${counter}. ` : '- '}${bare}`;
  });

  const block = rewritten.join('\n');
  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    selectionStart: lineStart + block.length,
    selectionEnd: lineStart + block.length,
  };
}

export function applyFormat(value: string, start: number, end: number, action: FormatAction): FormatResult {
  switch (action) {
    case 'bold':
      return toggleInline(value, start, end, '**', '**', 'bold text');
    case 'italic':
      return toggleInline(value, start, end, '_', '_', 'italic text');
    case 'underline':
      return toggleInline(value, start, end, '<u>', '</u>', 'underlined text');
    case 'code':
      return toggleCode(value, start, end);
    case 'bulletList':
      return toggleList(value, start, end, false);
    case 'orderedList':
      return toggleList(value, start, end, true);
  }
}
