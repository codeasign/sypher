import { readFileSync } from 'node:fs';
import * as babelParser from '@babel/parser';

// Finds the raw substring for `propName={...}` in a JSX-like source blob,
// starting the scan at the `{` immediately after `propName=`. Correctly
// skips over the CONTENTS of single/double-quoted strings and backtick
// template literals (which are full of unrelated braces from embedded
// source code) so brace-depth tracking doesn't get confused by them.
function extractPropRawValue(source, propName) {
  const marker = `${propName}={`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const open = start + propName.length + 1; // position of the JSX-wrapper's opening `{`
  let i = open;
  let depth = 0;
  let inString = null; // one of `'`, `"`, "`", or null
  let close = -1;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped char
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close === -1) return null;
  // Strip the JSX-wrapper's own outer braces -- the real JS expression
  // (an ArrayExpression for testCases, an ObjectExpression for starterCode/
  // harness) is what's between them.
  return { raw: source.slice(open + 1, close), start: open + 1, end: close };
}

function parseExpr(raw) {
  const ast = babelParser.parseExpression(raw, {
    plugins: ['jsx'],
  });
  return ast;
}

function literalValue(node) {
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral') {
    // These template literals never use ${} interpolation in this course's
    // content -- confirmed structurally. Take the single quasi's cooked value.
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  if (node.type === 'BooleanLiteral') return node.value;
  if (node.type === 'NumericLiteral') return node.value;
  if (node.type === 'ObjectExpression') return objectExpr(node);
  if (node.type === 'ArrayExpression') return node.elements.map(literalValue);
  throw new Error(`Unsupported literal node type: ${node.type}`);
}

function objectExpr(node) {
  const out = {};
  for (const prop of node.properties) {
    const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    out[key] = literalValue(prop.value);
  }
  return out;
}

// Parses one exercise .mdx file. Returns { testCases, starterCode, harness, meta } or throws.
export function parseExerciseFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const testCasesRaw = extractPropRawValue(source, 'testCases');
  const starterCodeRaw = extractPropRawValue(source, 'starterCode');
  const harnessRaw = extractPropRawValue(source, 'harness');
  if (!testCasesRaw || !starterCodeRaw || !harnessRaw) {
    throw new Error(`Missing one of testCases/starterCode/harness in ${filePath}`);
  }
  const testCases = literalValue(parseExpr(testCasesRaw.raw));
  const starterCode = literalValue(parseExpr(starterCodeRaw.raw));
  const harness = literalValue(parseExpr(harnessRaw.raw));
  return { testCases, starterCode, harness };
}

// Parses a solutions .mdx file's <Tabs> block, extracting one fenced code
// block per <TabItem value="LANG" ...>. Returns { [lang]: code }. Fenced
// code blocks (```lang ... ```) are markdown, not JS, so this is a plain
// text scan, not an AST parse.
export function parseSolutionsFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const result = {};
  const tabItemRe = /<TabItem\s+value="([a-zA-Z0-9_]+)"[^>]*>/g;
  let match;
  const positions = [];
  while ((match = tabItemRe.exec(source)) !== null) {
    positions.push({ lang: match[1], start: match.index + match[0].length });
  }
  for (const { lang, start } of positions) {
    const fenceStart = source.indexOf('```', start);
    if (fenceStart === -1) continue;
    // The fence's own column position is the common indentation markdown
    // applies to every line inside it (matches the closing ``` too) --
    // strip that many leading spaces from each line so the code is
    // column-0-anchored, since e.g. Python is indentation-sensitive.
    const lineStart = source.lastIndexOf('\n', fenceStart) + 1;
    const indent = fenceStart - lineStart;
    const firstNewline = source.indexOf('\n', fenceStart);
    if (firstNewline === -1) continue;
    const fenceEnd = source.indexOf('```', firstNewline);
    if (fenceEnd === -1) continue;
    const body = source.slice(firstNewline + 1, fenceEnd).replace(/\n$/, '');
    const prefix = ' '.repeat(indent);
    const dedented = body
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line.slice(indent) : line))
      .join('\n');
    result[lang] = dedented;
  }
  return result;
}

// Self-test when run directly with a file argument (not when imported --
// process.argv is process-global, so guard on the entry script's own basename).
const isMainModule = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('_audit-extract.mjs');
if (isMainModule && process.argv[2]) {
  const target = process.argv[2];
  const parsed = parseExerciseFile(target);
  console.log('testCases count:', parsed.testCases.length);
  console.log('starterCode languages:', Object.keys(parsed.starterCode));
  console.log('harness languages:', Object.keys(parsed.harness));
  console.log('first testCase:', JSON.stringify(parsed.testCases[0]));
  console.log('python starterCode:\n', parsed.starterCode.python);
  console.log('python harness:\n', parsed.harness.python);

  const solutionsPath = process.argv[3];
  if (solutionsPath) {
    const sol = parseSolutionsFile(solutionsPath);
    console.log('solution languages:', Object.keys(sol));
    console.log('python solution:\n', sol.python);
  }
}
