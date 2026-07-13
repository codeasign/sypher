#!/usr/bin/env node
/**
 * Scans .mdx files for AsciiDiagram components that use the children pattern
 * (>{`...`}) instead of the content prop (content={`...`}), and fixes them.
 *
 * The component reads props.content, not props.children — so children-pattern
 * diagrams render as empty pre blocks.
 *
 * Usage:
 *   node scripts/fix-asciidiagram-prop.mjs                    # fix all docs/
 *   node scripts/fix-asciidiagram-prop.mjs --dir path/to/dir  # fix a subtopic
 *   node scripts/fix-asciidiagram-prop.mjs --dry-run          # preview only
 *
 * Idempotent: safe to re-run; second pass finds nothing to fix.
 */

import fs   from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT       = path.resolve(path.dirname(__filename), '..');
const args = process.argv.slice(2);
const has  = (f) => args.includes(f);
const get  = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };

const TARGET_DIR = path.resolve(get('--dir') || path.join(ROOT, 'docs'));
const DRY_RUN    = has('--dry-run');

const log = (m) => console.log(`[fix-prop] ${m}`);
const ok  = (m) => console.log(`[fix-prop] ✅ ${m}`);
const fix = (m) => console.log(`[fix-prop] 🔧 ${m}`);

// Regex: opening children pattern — line ends with `>`, next line starts with {`
//   Before: `>\n  {``...content...``}   After: `\n  content={``...content...``} />
//   The `>` is the JSX tag closer — it gets replaced by `content=`
const OPENING_RE = />(\n[ \t]*)\{`/g;
// Regex: closing tag — `}</AsciiDiagram>` same line or `}\n</AsciiDiagram>` across lines
const CLOSING_RE = /`\}\n?[ \t]*<\/AsciiDiagram>/g;

function findMdx(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findMdx(full));
    else if (e.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function fixContent(content) {
  let c = content;
  let changed = false;

  // Step 1: fix closing tag — `}\n</AsciiDiagram> or `}</AsciiDiagram> → `} />
  const c1 = c.replace(CLOSING_RE, '`} />');
  if (c1 !== c) changed = true;
  c = c1;

  // Step 2: fix opening children — drop `>`, keep indent, add `content={`
  const c2 = c.replace(OPENING_RE, '$1content={`');
  if (c2 !== c) changed = true;
  c = c2;

  return { content: c, changed };
}

function main() {
  log(`Target: ${TARGET_DIR}`);
  if (DRY_RUN) log('DRY RUN — no files will be modified');

  const files = findMdx(TARGET_DIR);
  log(`Found ${files.length} .mdx file(s)`);

  let fixed = 0, unchanged = 0, errors = 0;

  for (const file of files) {
    try {
      const src = fs.readFileSync(file, 'utf8');
      const {content, changed} = fixContent(src);

      if (changed) {
        const closings = (src.match(CLOSING_RE) || []).length;
        const openings = (src.match(OPENING_RE) || []).length;
        const total = Math.max(closings, openings);
        if (DRY_RUN) {
          fix(`${path.relative(ROOT, file)} — ${total} diagram(s) to fix`);
        } else {
          fs.writeFileSync(file, content, 'utf8');
          ok(`${path.relative(ROOT, file)} — fixed ${total} diagram(s)`);
        }
        fixed++;
      } else {
        unchanged++;
      }
    } catch (e) {
      console.error(`[fix-prop] ❌ ${path.relative(ROOT, file)}: ${e.message}`);
      errors++;
    }
  }

  if (DRY_RUN) {
    log(`\nDone. Would fix: ${fixed} file(s)  Unchanged: ${unchanged}  Errors: ${errors}`);
  } else {
    log(`\nDone. Fixed: ${fixed} file(s)  Unchanged: ${unchanged}  Errors: ${errors}`);
  }
}

main();