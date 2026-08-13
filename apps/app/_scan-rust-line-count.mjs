import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Cross-checks each problem's rust harness `read_line` call count against
// the highest `data[N]` index its python harness references (N+1 lines
// expected). A rust harness reading fewer lines than python expects is the
// same bug class found in remove-duplicates/trapping-rain-water: it silently
// misreads the count line as the values line.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function extractHarnessBlock(source, lang) {
  const marker = `\n    ${lang}: \``;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const bodyStart = start + marker.length;
  // Find the matching closing backtick that's followed by `,` or `\n  }}`.
  const end = source.indexOf('`,\n', bodyStart);
  const end2 = source.indexOf('`}}', bodyStart);
  let realEnd = -1;
  if (end !== -1 && (end2 === -1 || end < end2)) realEnd = end;
  else if (end2 !== -1) realEnd = end2;
  if (realEnd === -1) return null;
  return source.slice(bodyStart, realEnd);
}

const files = walk('D:/jenny/sypher/apps/docs/docs/coding-bootcamp');
let flagged = 0;

for (const full of files) {
  if (!full.includes('/exercises/') && !full.includes('\\exercises\\')) continue;
  const relPath = full.replace('D:/jenny/sypher/', '').replace(/\\/g, '/');
  const source = readFileSync(full, 'utf8');
  if (!/harness=\{\{/.test(source)) continue;
  const harnessSection = source.slice(source.indexOf('harness={{'));

  const rustBlock = extractHarnessBlock(harnessSection, 'rust');
  const pyBlock = extractHarnessBlock(harnessSection, 'python');
  if (!rustBlock || !pyBlock) continue;

  const rustReadLines = (rustBlock.match(/read_line\(&mut/g) || []).length;
  if (rustReadLines === 0) continue; // no stdin reading at all -- not this bug class

  const dataIndices = [...pyBlock.matchAll(/data\[(\d+)\]/g)].map((m) => parseInt(m[1], 10));
  if (dataIndices.length === 0) continue;
  const maxIndex = Math.max(...dataIndices);
  const pyExpectedLines = maxIndex + 1;

  if (rustReadLines < pyExpectedLines) {
    console.log(`[SUSPECT] ${relPath}`);
    console.log(`    rust read_line calls: ${rustReadLines}, python expects >= ${pyExpectedLines} lines (data[${maxIndex}] referenced)`);
    flagged++;
  }
}

console.log(`\n=== SUMMARY: ${flagged} suspect file(s) ===`);
