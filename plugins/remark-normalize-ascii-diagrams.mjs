import { visit } from 'unist-util-visit';

/* -------------------------------------------------------------------------- */
/* Arrow normalization                                                        */
/* -------------------------------------------------------------------------- */

const ARROWS = [
  [/──>/g, '──→'],
  [/<──/g, '←──'],
  [/-->/g, '──→'],
  [/<--/g, '←──'],
  [/(?<![{`\w])->(?![}`\w])/g, '→'],
  [/(?<![{`\w])<-(?![}`\w])/g, '←'],
];

function normalizeArrows(text) {
  for (const [regex, replacement] of ARROWS) {
    text = text.replace(regex, replacement);
  }
  return text;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function visualLength(str) {
  return [...str.replace(/\x1b\[[0-9;]*m/g, '')].length;
}

/* -------------------------------------------------------------------------- */
/* Box detection on a single line                                             */
/* -------------------------------------------------------------------------- */

const OPEN_BORDER = { '┌': 'top', '├': 'sep', '└': 'bottom', '+': 'top' };
const CLOSE_BORDER = { '┐': 'top', '┤': 'sep', '┘': 'bottom', '+': 'top' };
const INTERIOR = { '│': 1, '|': 1 };
const BORDER_CHARS = /^[─┬┴━│|\-=]*$/;

/**
 * Find all box segments on a single line.
 * Each segment is a pair of matching border or interior characters.
 * Returns [{start, end, kind}]
 *   kind: 'top' | 'sep' | 'bottom' | 'interior'
 */
function findBoxSegments(line) {
  const chars = [...line];
  const segments = [];

  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];

    // Border line (┌──┐, ├──┤, └──┘, +--+)
    if (ch in OPEN_BORDER) {
      let j = i + 1;
      // Scan for the matching closing character
      while (j < chars.length && !(chars[j] in CLOSE_BORDER)) {
        j++;
      }
      if (j < chars.length && chars[j] in CLOSE_BORDER) {
        const interior = chars.slice(i + 1, j).join('');
        if (BORDER_CHARS.test(interior)) {
          const kind = ch === '+' ? 'top' : OPEN_BORDER[ch];
          segments.push({ start: i, end: j, kind });
          i = j + 1;
          continue;
        }
      }
    }

    // Interior line (│ content │ or | content |)
    if (ch in INTERIOR) {
      let j = i + 1;
      // Find the very next │ or | — that's the closing border
      while (j < chars.length && !(chars[j] in INTERIOR)) {
        j++;
      }
      if (j < chars.length) {
        segments.push({ start: i, end: j, kind: 'interior' });
        i = j + 1;
        continue;
      }
    }

    i++;
  }

  return segments;
}

/* -------------------------------------------------------------------------- */
/* Vertical box grouping                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Given a contiguous block of lines (startLine to endLine inclusive),
 * group the box segments vertically into individual boxes.
 *
 * A box is defined by its horizontal span (left, right) and its vertical extent
 * (topLine, interiorLines, bottomLine).
 *
 * Matching: regions on adjacent lines belong to the same box if their start
 * positions are within 1 character of each other.
 */
function extractBoxes(lines, startLine, endLine) {
  // Collect segments per line
  const perLine = [];
  for (let n = startLine; n <= endLine; n++) {
    perLine.push(findBoxSegments(lines[n]));
  }

  if (perLine.length === 0) return [];

  // Use the first line's segments as the initial set of box columns
  // Each box is tracked by its LEFT position
  const boxes = []; // { left, right, topLine, interiorLines[], bottomLine, topKind }

  // Initialize from the first line
  for (const seg of perLine[0]) {
    boxes.push({
      left: seg.start,
      right: seg.end,
      topLine: startLine,
      bottomLine: startLine,
      interiorLines: [],
      topKind: seg.kind,
      bottomKind: seg.kind,
    });
  }

  // Process remaining lines
  for (let row = 1; row < perLine.length; row++) {
    const currentSegments = perLine[row];
    const matched = new Set();

    for (const seg of currentSegments) {
      // Find the box with the closest matching left position
      let best = -1;
      let bestDist = 2; // tolerance of 1 char
      for (let b = 0; b < boxes.length; b++) {
        const dist = Math.abs(seg.start - boxes[b].left);
        if (dist < bestDist) {
          bestDist = dist;
          best = b;
        }
      }

      if (best >= 0) {
        const box = boxes[best];

        if (seg.kind === 'interior') {
          // Interior lines belong to the box but do NOT set bottomLine
          // (only actual border lines └/├/┘/┤ set it — prevents connector
          //  lines like │  │ from being treated as box bottoms)
          box.interiorLines.push(startLine + row);
        } else {
          // Border line: this is a bottom (or separator) for this box
          box.bottomLine = startLine + row;
          box.bottomKind = seg.kind;
          // DO NOT update box.right — the top border is the only source of truth
        }
      }
    }
  }

  return boxes;
}

/* -------------------------------------------------------------------------- */
/* Single-box normalization                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a single box's interior lines to match the top border width.
 * Modifies resultLines in place.
 *
 * Rule 22: Read top border width → pad interior rows → rewrite bottom border → done.
 */
function normalizeSingleBox(lines, resultLines, box) {
  const topLine = lines[box.topLine];
  const topChars = [...topLine];
  const leftPos = box.left;
  const rightPos = box.right;
  const innerWidth = rightPos - leftPos - 1; // chars between the two border chars

  if (innerWidth < 0) return;

  // ── Normalize interior lines ──────────────────────────────────────────
  for (const lineIdx of box.interiorLines) {
    const origChars = [...lines[lineIdx]];
    const resultRow = resultLines[lineIdx];

    // Find the left │ or | near the box's left boundary
    let leftBorder = -1;
    for (let p = Math.max(0, leftPos - 1); p <= Math.min(origChars.length - 1, leftPos + 1); p++) {
      if (origChars[p] in INTERIOR) { leftBorder = p; break; }
    }
    if (leftBorder < 0) continue;

    // Find the RIGHT border for this box segment.
    // Strategy:
    //   1. Try backwards from expected rightPos (handles aligned, nested,
    //      and side-by-side boxes).
    //   2. If not found and the line has 3+ │ chars (connector lines like
    //      │  │  │), use the last │ on the line — preserves connector lines.
    //   3. If not found and the line has ≤2 │ chars (misaligned box interior),
    //      scan forward from left border to find the next │.
    let rightBorder = -1;
    for (let p = Math.min(origChars.length - 1, rightPos + 1); p >= Math.max(0, rightPos - 1); p--) {
      if (origChars[p] in INTERIOR) { rightBorder = p; break; }
    }
    if (rightBorder < 0) {
      // Count │ chars to decide which fallback to use
      const interiorCount = origChars.filter(c => c in INTERIOR).length;
      if (interiorCount > 2) {
        // Connector line — use the last │ to preserve the line
        for (let p = origChars.length - 1; p >= leftBorder + 1; p--) {
          if (origChars[p] in INTERIOR) { rightBorder = p; break; }
        }
      } else {
        // Misaligned box interior — use the next │ forward
        for (let p = leftBorder + 1; p < origChars.length; p++) {
          if (origChars[p] in INTERIOR) { rightBorder = p; break; }
        }
      }
    }
    if (rightBorder < 0) continue;

    // Extract content between the two borders
    const leftChar = origChars[leftBorder];
    const rightChar = origChars[rightBorder];
    const contentStr = origChars.slice(leftBorder + 1, rightBorder).join('');

    // Pad content to innerWidth (never truncate — rule 6)
    const padded = contentStr.length >= innerWidth
      ? contentStr
      : contentStr + ' '.repeat(innerWidth - contentStr.length);

    // Rebuild: preserve everything before leftPos, then border + padded + border + suffix
    const suffix = origChars.slice(rightBorder + 1);
    const newChars = [];

    // 1) Everything before the box's left boundary (indentation)
    for (let p = 0; p < leftPos; p++) {
      newChars.push(p < origChars.length ? origChars[p] : ' ');
    }
    // 2) Left border character at position leftPos
    newChars.push(leftChar);
    // 3) Padded content (exactly innerWidth chars)
    for (const ch of padded) { newChars.push(ch); }
    // 4) Right border character at position leftPos + 1 + innerWidth = rightPos
    newChars.push(rightChar);
    // 5) Everything after the original right border (preserves side-by-side content)
    for (const ch of suffix) { newChars.push(ch); }

    // Write the result
    while (resultRow.length < newChars.length) { resultRow.push(' '); }
    for (let p = 0; p < newChars.length; p++) { resultRow[p] = newChars[p]; }
  }

  // ── Normalize bottom border ─────────────────────────────────────────────
  if (box.bottomLine !== box.topLine) {
    const bottomChars = [...lines[box.bottomLine]];
    const resultRow = resultLines[box.bottomLine];

    // Determine the bottom left border character from the actual bottom line
    // (└, ├, +, or their right counterparts)
    let bottomLeft = '│';
    // Try near expected leftPos first
    for (let p = Math.max(0, leftPos - 1); p <= Math.min(bottomChars.length - 1, leftPos + 1); p++) {
      if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
        bottomLeft = bottomChars[p];
        break;
      }
    }
    // Fallback: scan from the actual start of the bottom line
    if (bottomLeft === '│') {
      for (let p = 0; p < bottomChars.length; p++) {
        if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
          bottomLeft = bottomChars[p];
          break;
        }
      }
    }

    // Determine the bottom right border character
    let bottomRight = '│';
    // Try near expected rightPos first
    for (let p = Math.min(bottomChars.length - 1, rightPos + 1); p >= Math.max(0, rightPos - 1); p--) {
      if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
        bottomRight = bottomChars[p];
        break;
      }
    }
    // Fallback: scan from the actual end of the bottom line
    if (bottomRight === '│') {
      for (let p = bottomChars.length - 1; p >= 0; p--) {
        if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
          bottomRight = bottomChars[p];
          break;
        }
      }
    }

    // Fill character: ─ for unicode, - for ASCII
    const isAscii = topChars[leftPos] === '+';
    const fillChar = isAscii ? '-' : '─';

    // Rebuild the bottom border at the same width as the top border
    let suffix = bottomChars.slice(rightPos + 1);
    // Trim any border fill chars from the start of the suffix —
    // they belong to an over-wide bottom border, not the content after it
    while (suffix.length > 0 && (
      suffix[0] === fillChar ||
      suffix[0] in OPEN_BORDER ||
      suffix[0] in CLOSE_BORDER ||
      suffix[0] in INTERIOR
    )) {
      suffix = suffix.slice(1);
    }
    const newChars = [];

    // 1) Preserve indentation
    for (let p = 0; p < leftPos; p++) {
      newChars.push(p < bottomChars.length ? bottomChars[p] : ' ');
    }
    // 2) Left border character
    newChars.push(bottomLeft);
    // 3) Fill
    for (let p = 0; p < innerWidth; p++) { newChars.push(fillChar); }
    // 4) Right border character
    newChars.push(bottomRight);
    // 5) Suffix (non-box content after the box)
    for (const ch of suffix) { newChars.push(ch); }

    while (resultRow.length < newChars.length) { resultRow.push(' '); }
    for (let p = 0; p < newChars.length; p++) { resultRow[p] = newChars[p]; }
    // Clear residual border chars from a previously-too-wide bottom line
    for (let p = newChars.length; p < resultRow.length; p++) {
      if (resultRow[p] === fillChar || resultRow[p] in CLOSE_BORDER || resultRow[p] in OPEN_BORDER) {
        resultRow[p] = ' ';
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main box normalization                                                     */
/* -------------------------------------------------------------------------- */

function normalizeBoxes(content) {
  const lines = content.split('\n');
  // Work with mutable character arrays
  const resultLines = lines.map(line => [...line]);

  // Scan for box blocks: consecutive lines that contain at least one box segment
  // and have the same number of segments. A change in segment count indicates
  // a structural transition (e.g. connector → box, or box → different box group).
  let i = 0;
  while (i < lines.length) {
    const segments = findBoxSegments(lines[i]);

    if (segments.length > 0) {
      // Find the extent of this box block — all lines must have the same
      // segment count to avoid grouping connector lines with box boundaries.
      const firstCount = segments.length;
      let j = i + 1;
      while (j < lines.length) {
        const nextSegments = findBoxSegments(lines[j]);
        if (nextSegments.length === 0 || nextSegments.length !== firstCount) break;
        j++;
      }

      // Extract individual boxes from this block
      const boxes = extractBoxes(lines, i, j - 1);

      // Normalize each box independently
      for (const box of boxes) {
        normalizeSingleBox(lines, resultLines, box);
      }

      i = j;
    } else {
      i++;
    }
  }

  return resultLines.map(row => row.join('')).join('\n');
}

/* -------------------------------------------------------------------------- */
/* Artifact cleanup                                                           */
/* -------------------------------------------------------------------------- */

function cleanArtifacts(content) {
  return content
    .replace(/(?<=│[^\S\n]*),(?=[^\S\n]*│)/g, ' ')
    .replace(/(?<=\|[^\S\n]*),(?=[^\S\n]*\|)/g, ' ')
    .replace(/^(\s*),(\s*[│|])/gm, '$1 $2');
}

/* -------------------------------------------------------------------------- */

function normalize(content) {
  return cleanArtifacts(
    normalizeBoxes(
      normalizeArrows(content)
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Remark plugin — patch AsciiDiagram content props                           */
/* -------------------------------------------------------------------------- */

function patchContentProp(node) {
  for (const attr of node.attributes ?? []) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.name?.name === 'content' &&
      attr.value?.type === 'JSXExpressionContainer' &&
      attr.value.expression?.type === 'TemplateLiteral' &&
      attr.value.expression.quasis?.length === 1
    ) {
      const quasi = attr.value.expression.quasis[0];

      const fixed = normalize(quasi.value.raw);

      quasi.value.raw = fixed;
      quasi.value.cooked = fixed;
    }
  }
}

function patchChildren(node) {
  for (const child of node.children ?? []) {
    if (
      child.type === 'JSXExpressionContainer' &&
      child.expression?.type === 'TemplateLiteral' &&
      child.expression.quasis?.length === 1
    ) {
      const quasi = child.expression.quasis[0];

      const fixed = normalize(quasi.value.raw);

      quasi.value.raw = fixed;
      quasi.value.cooked = fixed;
    }
  }
}

/* -------------------------------------------------------------------------- */

export default function remarkNormalizeAsciiDiagrams() {
  return tree => {
    visit(tree, node => {
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        node.name === 'AsciiDiagram'
      ) {
        patchContentProp(node);
        patchChildren(node);
      }
    });
  };
}