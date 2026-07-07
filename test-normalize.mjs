// Test the box-based normalization

// Replicate the exact implementation from the plugin for testing
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

const OPEN_BORDER = { '┌': 'top', '├': 'sep', '└': 'bottom', '+': 'top' };
const CLOSE_BORDER = { '┐': 'top', '┤': 'sep', '┘': 'bottom', '+': 'top' };
const INTERIOR = { '│': 1, '|': 1 };
const BORDER_CHARS = /^[─┬┴━│|\-=]*$/;

function findBoxSegments(line) {
  const chars = [...line];
  const segments = [];

  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];

    if (ch in OPEN_BORDER) {
      let j = i + 1;
      while (j < chars.length && !(chars[j] in CLOSE_BORDER)) { j++; }
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

    if (ch in INTERIOR) {
      let j = i + 1;
      while (j < chars.length && !(chars[j] in INTERIOR)) { j++; }
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

function extractBoxes(lines, startLine, endLine) {
  const perLine = [];
  for (let n = startLine; n <= endLine; n++) {
    perLine.push(findBoxSegments(lines[n]));
  }
  if (perLine.length === 0) return [];

  const boxes = [];
  for (const seg of perLine[0]) {
    boxes.push({
      left: seg.start, right: seg.end,
      topLine: startLine, bottomLine: startLine,
      interiorLines: [],
      topKind: seg.kind, bottomKind: seg.kind,
    });
  }

  for (let row = 1; row < perLine.length; row++) {
    const currentSegments = perLine[row];
    for (const seg of currentSegments) {
      let best = -1, bestDist = 2;
      for (let b = 0; b < boxes.length; b++) {
        const dist = Math.abs(seg.start - boxes[b].left);
        if (dist < bestDist) { bestDist = dist; best = b; }
      }
      if (best >= 0) {
        const box = boxes[best];
        if (seg.kind === 'interior') {
          box.interiorLines.push(startLine + row);
        } else {
          box.bottomLine = startLine + row;
          box.bottomKind = seg.kind;
        }
      }
    }
  }
  return boxes;
}

function normalizeSingleBox(lines, resultLines, box) {
  const topChars = [...lines[box.topLine]];
  const leftPos = box.left;
  const rightPos = box.right;
  const innerWidth = rightPos - leftPos - 1;
  if (innerWidth < 0) return;

  for (const lineIdx of box.interiorLines) {
    const origChars = [...lines[lineIdx]];
    const resultRow = resultLines[lineIdx];

    let leftBorder = -1;
    for (let p = Math.max(0, leftPos - 1); p <= Math.min(origChars.length - 1, leftPos + 1); p++) {
      if (origChars[p] in INTERIOR) { leftBorder = p; break; }
    }
    if (leftBorder < 0) continue;

    let rightBorder = -1;
    for (let p = Math.min(origChars.length - 1, rightPos + 1); p >= Math.max(0, rightPos - 1); p--) {
      if (origChars[p] in INTERIOR) { rightBorder = p; break; }
    }
    if (rightBorder < 0) {
      const interiorCount = origChars.filter(c => c in INTERIOR).length;
      if (interiorCount > 2) {
        for (let p = origChars.length - 1; p >= leftBorder + 1; p--) {
          if (origChars[p] in INTERIOR) { rightBorder = p; break; }
        }
      } else {
        for (let p = leftBorder + 1; p < origChars.length; p++) {
          if (origChars[p] in INTERIOR) { rightBorder = p; break; }
        }
      }
    }
    if (rightBorder < 0) continue;

    const leftChar = origChars[leftBorder];
    const rightChar = origChars[rightBorder];
    const contentStr = origChars.slice(leftBorder + 1, rightBorder).join('');
    const padded = contentStr.length >= innerWidth
      ? contentStr
      : contentStr + ' '.repeat(innerWidth - contentStr.length);
    const suffix = origChars.slice(rightBorder + 1);

    const newChars = [];
    for (let p = 0; p < leftPos; p++) {
      newChars.push(p < origChars.length ? origChars[p] : ' ');
    }
    newChars.push(leftChar);
    for (const ch of padded) { newChars.push(ch); }
    newChars.push(rightChar);
    for (const ch of suffix) { newChars.push(ch); }

    while (resultRow.length < newChars.length) { resultRow.push(' '); }
    for (let p = 0; p < newChars.length; p++) { resultRow[p] = newChars[p]; }
  }

  if (box.bottomLine !== box.topLine) {
    const bottomChars = [...lines[box.bottomLine]];
    const resultRow = resultLines[box.bottomLine];

    let bottomLeft = '│';
    for (let p = Math.max(0, leftPos - 1); p <= Math.min(bottomChars.length - 1, leftPos + 1); p++) {
      if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
        bottomLeft = bottomChars[p]; break;
      }
    }
    if (bottomLeft === '│') {
      for (let p = 0; p < bottomChars.length; p++) {
        if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
          bottomLeft = bottomChars[p]; break;
        }
      }
    }
    let bottomRight = '│';
    for (let p = Math.min(bottomChars.length - 1, rightPos + 1); p >= Math.max(0, rightPos - 1); p--) {
      if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
        bottomRight = bottomChars[p]; break;
      }
    }
    if (bottomRight === '│') {
      for (let p = bottomChars.length - 1; p >= 0; p--) {
        if (bottomChars[p] in OPEN_BORDER || bottomChars[p] in CLOSE_BORDER) {
          bottomRight = bottomChars[p]; break;
        }
      }
    }

    const isAscii = topChars[leftPos] === '+';
    const fillChar = isAscii ? '-' : '─';
    let suffix = bottomChars.slice(rightPos + 1);
    while (suffix.length > 0 && (
      suffix[0] === fillChar ||
      suffix[0] in OPEN_BORDER ||
      suffix[0] in CLOSE_BORDER ||
      suffix[0] in INTERIOR
    )) {
      suffix = suffix.slice(1);
    }

    const newChars = [];
    for (let p = 0; p < leftPos; p++) {
      newChars.push(p < bottomChars.length ? bottomChars[p] : ' ');
    }
    newChars.push(bottomLeft);
    for (let p = 0; p < innerWidth; p++) { newChars.push(fillChar); }
    newChars.push(bottomRight);
    for (const ch of suffix) { newChars.push(ch); }

    while (resultRow.length < newChars.length) { resultRow.push(' '); }
    for (let p = 0; p < newChars.length; p++) { resultRow[p] = newChars[p]; }
    for (let p = newChars.length; p < resultRow.length; p++) {
      if (resultRow[p] === fillChar || resultRow[p] in CLOSE_BORDER || resultRow[p] in OPEN_BORDER) {
        resultRow[p] = ' ';
      }
    }
  }
}

function normalizeBoxes(content) {
  const lines = content.split('\n');
  const resultLines = lines.map(line => [...line]);

  let i = 0;
  while (i < lines.length) {
    const segments = findBoxSegments(lines[i]);
    if (segments.length > 0) {
      const firstCount = segments.length;
      let j = i + 1;
      while (j < lines.length) {
        const nextSegments = findBoxSegments(lines[j]);
        if (nextSegments.length === 0 || nextSegments.length !== firstCount) break;
        j++;
      }
      const boxes = extractBoxes(lines, i, j - 1);
      for (const box of boxes) { normalizeSingleBox(lines, resultLines, box); }
      i = j;
    } else {
      i++;
    }
  }
  return resultLines.map(row => row.join('')).join('\n');
}

function normalize(content) {
  return normalizeBoxes(normalizeArrows(content));
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

let passCount = 0, failCount = 0;

function runTest(name, input, expected) {
  const result = normalize(input);
  const pass = result === expected;
  if (pass) { passCount++; } else { failCount++; }
  console.log(`${pass ? '✓' : '✗'} ${name}`);
  if (!pass) {
    console.log("  Input:");
    input.split('\n').forEach(l => console.log(`  |${l}|`));
    console.log("  Expected:");
    expected.split('\n').forEach(l => console.log(`  |${l}|`));
    console.log("  Got:");
    result.split('\n').forEach(l => console.log(`  |${l}|`));
  }
}

// Test 1: Simple box (already correct)
runTest("Simple box (unchanged)",
  `┌──────┐\n│ text │\n└──────┘`,
  `┌──────┐\n│ text │\n└──────┘`
);

// Test 2: Misaligned interior (content too short)
runTest("Misaligned interior padded",
  `┌──────────────┐\n│ text │\n└──────────────┘`,
  `┌──────────────┐\n│ text         │\n└──────────────┘`
);

// Test 3: Multiple boxes with connectors (untouched)
runTest("Multiple boxes with connectors",
  `┌──────┐\n│  A   │\n└──────┘\n   │\n   ▼\n┌──────┐\n│  B   │\n└──────┘`,
  `┌──────┐\n│  A   │\n└──────┘\n   │\n   ▼\n┌──────┐\n│  B   │\n└──────┘`
);

// Test 4: UML compartments
runTest("UML compartments",
  `┌──────────────────────┐\n│   <<interface>>      │\n│     Service          │\n├──────────────────────┤\n│   + execute()        │\n└──────────────────────┘`,
  `┌──────────────────────┐\n│   <<interface>>      │\n│     Service          │\n├──────────────────────┤\n│   + execute()        │\n└──────────────────────┘`
);

// Test 5: Side-by-side boxes
runTest("Side-by-side boxes",
  `┌──────┐  ┌──────────┐\n│  A   │  │    B     │\n└──────┘  └──────────┘`,
  `┌──────┐  ┌──────────┐\n│  A   │  │    B     │\n└──────┘  └──────────┘`
);

// Test 6: ASCII box
runTest("ASCII box (unchanged)",
  `+--------+\n| Client |\n+--------+`,
  `+--------+\n| Client |\n+--------+`
);

// Test 7: Content needs padding
runTest("Content needs padding",
  `┌──────────────────┐\n│ text │\n└──────────────────┘`,
  `┌──────────────────┐\n│ text             │\n└──────────────────┘`
);

// Test 8: Mixed width side-by-side boxes
runTest("Mixed width side-by-side",
  `┌──────┐  ┌────────────┐\n│  A   │  │  LongOne   │\n└──────┘  └────────────┘`,
  `┌──────┐  ┌────────────┐\n│  A   │  │  LongOne   │\n└──────┘  └────────────┘`
);

// Test 9: System design style (ASCII)
runTest("System design ASCII",
  `+--------+\n| Client |\n+--------+\n     |\n     v\n+--------+\n|   LB   |\n+--------+`,
  `+--------+\n| Client |\n+--------+\n     |\n     v\n+--------+\n|   LB   |\n+--------+`
);

// Test 10: Idempotent
(() => {
  const input = `┌──────┐\n│ text │\n└──────┘`;
  const once = normalize(input);
  const twice = normalize(once);
  const pass = once === twice;
  if (pass) { passCount++; } else { failCount++; }
  console.log(`${pass ? '✓' : '✗'} Idempotent`);
  if (!pass) {
    console.log(`  First: ${JSON.stringify(once)}`);
    console.log(`  Second: ${JSON.stringify(twice)}`);
  }
})();

// Test 11: Indented box
runTest("Indented box (unchanged)",
  `  ┌──────┐\n  │ text │\n  └──────┘`,
  `  ┌──────┐\n  │ text │\n  └──────┘`
);

// Test 12: Box with extra spaces
runTest("Box with extra spaces (padded)",
  `┌──────────────┐\n│   text  │\n└──────────────┘`,
  `┌──────────────┐\n│   text       │\n└──────────────┘`
);

// Test 13: Different width boxes (independent)
runTest("Different width boxes (independent)",
  `┌──┐     ┌────────┐\n│A │     │  Long  │\n└──┘     └────────┘`,
  `┌──┐     ┌────────┐\n│A │     │  Long  │\n└──┘     └────────┘`
);

// Test 14: Box with extra long content (don't truncate)
runTest("Extra long content (don't truncate)",
  `┌──────┐\n│ very long content here │\n└──────┘`,
  `┌──────┐\n│ very long content here │\n└──────┘`
);

// Test 15: Factory method diagram — three side-by-side with different widths
runTest("Factory method side-by-side",
  `┌───────────────┐  ┌──────────┐  ┌──────────────────┐\n│  Account      │  │  Account │  │  Loan            │\n│  Factory      │  │  (inter) │  │  Account         │\n├───────────────┤  ├──────────┤  ├──────────────────┤\n│ + create()    │  │ + dep()  │  │ + deposit()      │\n│ + open()      │  │ + with() │  │ + withdraw()     │\n│ + get()       │  │ + bal()  │  │ + get_balance()  │\n└───────────────┘  └──────────┘  └──────────────────┘`,
  `┌───────────────┐  ┌──────────┐  ┌──────────────────┐\n│  Account      │  │  Account │  │  Loan            │\n│  Factory      │  │  (inter) │  │  Account         │\n├───────────────┤  ├──────────┤  ├──────────────────┤\n│ + create()    │  │ + dep()  │  │ + deposit()      │\n│ + open()      │  │ + with() │  │ + withdraw()     │\n│ + get()       │  │ + bal()  │  │ + get_balance()  │\n└───────────────┘  └──────────┘  └──────────────────┘`
);

// Test 16: Box with misaligned bottom border
runTest("Misaligned bottom border",
  `┌──────────────┐\n│ text         │\n└────┘`,
  `┌──────────────┐\n│ text         │\n└──────────────┘`
);

// Test 17: Complex factory method pattern
runTest("Complex factory method",
  `┌─────────────────────────────────────────────────┐
│              <<Creator>>                            │
│            AccountFactory                           │
├─────────────────────────────────────────────────┤
│  + create_account(type: str) : Account             │
│  # open_account(account: Account) : void            │
└─────────────────────────────────────────────────┘
          ▲                    │
          │                    │ calls
          │                    ▼
          │         ┌───────────────────────────────┐
          │         │   <<Product>>                 │
          │         │     Account                   │
          │         ├───────────────────────────────┤
          │         │  + deposit(amount)            │
          │         │  + withdraw(amount)           │
          │         │  + get_balance()              │
          │         │  + get_account_type() : str   │
          │         └───────────────────────────────┘
          │                   ▲
          │                   │
          │         ┌────────┴────────┐
          │         │                 │
┌─────────┴─────┐ ┌──┴───────────┐ ┌──┴──────────────┐
│ Savings       │ │ Checking     │ │ Loan             │
│ Account       │ │ Account      │ │ Account          │
├───────────────┤ ├──────────────┤ ├──────────────────┤
│ + deposit()   │ │ + deposit()  │ │ + deposit()      │
│ + withdraw()  │ │ + withdraw() │ │ + withdraw()     │
│ + get_balance │ │+ apply_over  │ │ + apply_penalty()│
│ + apply_int() │ │ + get_bal()  │ │ + get_type()     │
│ + get_type()  │ │ + get_type() │ │ + get_type()     │
└───────────────┘ └──────────────┘ └──────────────────┘`,
  `┌─────────────────────────────────────────────────┐
│              <<Creator>>                            │
│            AccountFactory                           │
├─────────────────────────────────────────────────┤
│  + create_account(type: str) : Account             │
│  # open_account(account: Account) : void            │
└─────────────────────────────────────────────────┘
          ▲                    │
          │                    │ calls
          │                    ▼
          │         ┌───────────────────────────────┐
          │         │   <<Product>>                 │
          │         │     Account                   │
          │         ├───────────────────────────────┤
          │         │  + deposit(amount)            │
          │         │  + withdraw(amount)           │
          │         │  + get_balance()              │
          │         │  + get_account_type() : str   │
          │         └───────────────────────────────┘
          │                   ▲
          │                   │
          │         ┌────────┴────────┐
          │         │                 │
┌─────────┴─────┐ ┌──┴───────────┐ ┌──┴──────────────┐
│ Savings       │ │ Checking     │ │ Loan             │
│ Account       │ │ Account      │ │ Account          │
├───────────────┤ ├──────────────┤ ├──────────────────┤
│ + deposit()   │ │ + deposit()  │ │ + deposit()      │
│ + withdraw()  │ │ + withdraw() │ │ + withdraw()     │
│ + get_balance │ │+ apply_over  │ │ + apply_penalty()│
│ + apply_int() │ │ + get_bal()  │ │ + get_type()     │
│ + get_type()  │ │ + get_type() │ │ + get_type()     │
└───────────────┘ └──────────────┘ └─────────────────┘`
);

// Test 18: Nested boxes
runTest("Nested boxes",
  `┌──────────────────┐\n│  ┌──────────┐    │\n│  │  inner   │    │\n│  └──────────┘    │\n│                  │\n└──────────────────┘`,
  `┌──────────────────┐\n│  ┌──────────┐    │\n│  │  inner   │    │\n│  └──────────┘    │\n│                  │\n└──────────────────┘`
);

// Arrow test (separate from box normalization)
const arrowResult = normalizeArrows("a -> b\nx --> y\n<-- z\nA\n|\nv\nB");
console.log(`\nArrow normalization:`);
console.log(arrowResult);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Results: ${passCount} passed, ${failCount} failed`);