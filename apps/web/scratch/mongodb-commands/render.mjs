#!/usr/bin/env node
/**
 * MongoDB Commands course — page renderer.
 *
 * Templates in ./src/*.md hold prose plus fenced ```js blocks. Every block is EXECUTED in a real
 * mongosh session against the lab's MongoDB container (sypher-db-lab) and the real output is written
 * into ./pages/*.mdx, so no result in the course is ever typed by hand. An unexpected error fails the render.
 *
 * Fence info strings (after `js`):
 *   run                 show the code, then the real output of each expression statement
 *   run lines=20        cut long output after 20 lines (default 40) with a "... N more lines" note
 *   run error           the block MUST raise an error; its message is shown
 *   run destructive     block changes data; the lab is restored afterwards and verified against the baseline
 *   run rs              run against the replica-set container (needed for transactions)
 *   run as=<user>       connect as that lesson-created user (password "password", authSource = the lab database)
 *   run noout           run it (must succeed) but do not print the output
 *   practice            expected output + hidden hint + hidden solution (`// hint:` lines become the hint)
 *   expect              output only (final project)
 *   show                just display the code, never executed
 * ```bash run           a real host shell command in the lab folder
 * {{= <js expression> }}  inline value from a real run (printed as JSON)
 *
 * How it works: the block is split into statements; declarations and control flow run as written, every
 * other (expression) statement is wrapped so its value is printed like the mongosh prompt would print it.
 * An expression statement that ends with `;` runs silently. Cursors are printed in full (use .limit()). `use name` and `show collections|dbs` are understood.
 *
 * Usage (from apps/web/scratch/mongodb-commands):
 *   node render.mjs                render every src/*.md -> pages/*.mdx
 *   node render.mjs src/01-x.md    render one
 *   node render.mjs --check        re-render in memory and fail if pages/ drifted
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = process.env.LAB_DIR || 'H:/Abhishek/DB/sypher-db-lab';
const GIT_BASH = process.env.GIT_BASH || 'C:/Program Files/Git/bin/bash.exe';
const DB = 'sypher-mongodb-DvdRental';
const DEFAULT_LINES = 40;

// --------------------------------------------------------------- statement splitting

/** Split JS source into top-level statements (bracket/string/comment aware; method chains continue). */
function splitStatements(src) {
  const stmts = [];
  let cur = '';
  let depth = 0;
  let i = 0;
  let quote = null;
  let lineStart = true;
  const flush = () => { if (cur.trim()) stmts.push(cur.trim()); cur = ''; };
  const lines = src.split('\n');
  // Work line by line, tracking bracket depth and string state across lines.
  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];
    if (depth === 0 && !quote) {
      const t = line.trim();
      if (t === '' || /^\/\/.*$/.test(t)) { if (cur.trim() === '') continue; }
      // A line starting with `.` (or `)`/`]`/`}`) continues the previous statement.
      if (cur.trim() && !/^[.)\]}]|^\?\.|^&&|^\|\||^\?|^:/.test(t)) {
        // previous statement complete? only if it did not end with an operator/comma/open construct
        if (!/[,+\-*/%=&|?:(\[{<>!]\s*$/.test(cur.trim().replace(/\/\/.*$/, '').trim())) flush();
      }
    }
    // scan the line
    for (let k = 0; k < line.length; k += 1) {
      const c = line[k];
      const n = line[k + 1];
      if (quote) {
        if (c === '\\') { k += 1; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '/' && n === '/') break; // rest is a comment
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '(' || c === '[' || c === '{') depth += 1;
      else if (c === ')' || c === ']' || c === '}') depth -= 1;
    }
    if (quote === '"' || quote === "'") quote = null; // unterminated normal strings end at the line end
    cur += `${line}\n`;
  }
  flush();
  return stmts;
}

const RAW_START = /^(const|let|var|function|async\s+function|class|if|for|while|do|switch|try|import|export|return|throw|\{)\b|^\{/;

function classify(stmt) {
  let s = stmt.trim();
  const use = /^use\s+([\w-]+)\s*;?$/.exec(s);
  if (use) return { kind: 'raw', code: `db = db.getSiblingDB(${JSON.stringify(use[1])});` };
  if (/^show\s+collections\s*;?$/.test(s)) return { kind: 'expr', code: 'db.getCollectionNames().sort()' };
  if (/^show\s+(dbs|databases)\s*;?$/.test(s)) return { kind: 'expr', code: 'db.adminCommand({ listDatabases: 1 }).databases.map((d) => d.name).sort()' };
  if (RAW_START.test(s)) return { kind: 'raw', code: s.endsWith(';') || s.endsWith('}') ? s : `${s};` };
  // assignment to a name is raw too (so variables persist), but its value is not printed
  if (/^[A-Za-z_$][\w$]*\s*=[^=]/.test(s)) return { kind: 'raw', code: s.endsWith(';') ? s : `${s};` };
  // a trailing `;` means "run it, do not print its result"
  if (s.endsWith(';')) return { kind: 'raw', code: s };
  return { kind: 'expr', code: s };
}

function buildScript(code, prefix = '') {
  const parts = splitStatements(code).map(classify);
  let out = prefix ? `${prefix}
` : '';
  parts.forEach((p, i) => {
    if (p.kind === 'raw') out += `console.log('@@S${i}@@');\n${p.code}\n`;
    else out += `await __show(${i}, async () => (${p.code}));\n`;
  });
  return `
globalThis.__show = async (i, thunk) => {
  console.log('@@S' + i + '@@');
  try {
    let v = await thunk();
    if (v && typeof v.toArray === 'function' && typeof v.hasNext === 'function') v = await v.toArray();
    if (v !== undefined) console.log(v);
  } catch (e) {
    console.log('@@ERR@@');
    console.log(e.name + ': ' + e.message);
    if (e.errInfo && e.errInfo.details) console.log('Additional information: ' + require('util').inspect(e.errInfo.details, { depth: 8, breakLength: 100 }));
  }
};
(async () => {
${out}
})().catch((e) => { console.log('@@FATAL@@'); console.log(e.name + ': ' + e.message); });
`;
}

// --------------------------------------------------------------- running

function mongoshArgs(flags) {
  const svc = flags.includes('rs') ? 'mongodb-rs' : 'mongodb';
  const as = flags.find((f) => f.startsWith('as='));
  const auth = flags.includes('rs') ? [] : (as
    ? ['-u', as.slice(3), '-p', 'password', '--authenticationDatabase', DB]
    : ['-u', 'sypher', '-p', 'password', '--authenticationDatabase', 'admin']);
  return ['compose', 'exec', '-T', svc, 'mongosh', '--quiet', ...auth, DB, '--file', '/dev/stdin'];
}

const maskIds = (t) => t
  .replace(/ObjectId\('[0-9a-f]{24}'\)/g, "ObjectId('…')")
  .replace(/UUID\("[0-9a-f-]{36}"\)/g, 'UUID("…")')
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '…')
  .replace(/durationMillis: \d+ms/g, 'durationMillis: …ms');

/** Run a block; returns { text, errors: [messages], fatal } */
function runBlock(code, flags = [], prefix = '') {
  const script = buildScript(code, prefix);
  const r = spawnSync('docker', mongoshArgs(flags), { cwd: LAB_DIR, input: script, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const raw = `${r.stdout || ''}${r.stderr || ''}`;
  if (!/@@S\d+@@|@@FATAL@@/.test(raw) && r.status !== 0) throw new Error(`mongosh failed:\n${raw.slice(0, 800)}`);
  // Split into per-statement output.
  const outputs = [];
  let errors = [];
  let cur = null;
  for (const line of raw.split(/\r?\n/)) {
    const m = /^@@S(\d+)@@$/.exec(line);
    if (m) { cur = { text: [], err: false }; outputs.push(cur); continue; }
    if (line === '@@ERR@@' && cur) { cur.err = true; continue; }
    if (line === '@@FATAL@@') { cur = { text: [], err: true, fatal: true }; outputs.push(cur); continue; }
    if (/^Warning: If there are no documents in the batch, next will block\./.test(line)) continue; // mongosh cursor hint, noise
    if (cur) cur.text.push(line);
  }
  errors = outputs.filter((o) => o.err).map((o) => o.text.join('\n').trim());
  return { outputs, errors, raw };
}

function resetLab() {
  const r = spawnSync(GIT_BASH, ['scripts/reset-mongodb.sh'], { cwd: LAB_DIR, encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || !text.includes('RESTORED')) throw new Error(`Lab restore FAILED:\n${text}`);
}

// --------------------------------------------------------------- rendering

const fence = (t, lang = 'js') => `\`\`\`${lang}\n${t.replace(/\s+$/, '')}\n\`\`\``;

function formatOutput(outputs, maxLines) {
  const chunks = outputs.map((o) => o.text.join('\n').replace(/\s+$/, '')).filter((t) => t !== '');
  let lines = maskIds(chunks.join('\n')).split('\n');
  let note = '';
  if (lines.length > maxLines) { note = `\n... ${lines.length - maxLines} more lines`; lines = lines.slice(0, maxLines); }
  return lines.join('\n') + note;
}

function renderBlock(info, body, where, page) {
  const flags = info.split(/\s+/).slice(1);
  const mode = flags[0];
  const linesFlag = flags.find((f) => f.startsWith('lines='));
  const maxLines = linesFlag ? Number(linesFlag.slice(6)) : DEFAULT_LINES;
  const wantsError = flags.includes('error');
  if (mode === 'show') return fence(body);
  if (flags.includes('destructive') || flags.includes('rs')) page.dirty = true;

  let hint = null;
  let code = body;
  if (mode === 'practice') {
    const hintLines = [];
    code = body.split('\n').filter((l) => {
      const m = /^\/\/\s*hint:\s*(.*)$/.exec(l.trim());
      if (m) { hintLines.push(m[1]); return false; }
      return true;
    }).join('\n');
    hint = hintLines.join(' ');
  }

  // Names bound to another database (`const lab = db.getSiblingDB(..)`) carry over between blocks of a page,
  // (and small helper arrow functions) as they would in one interactive session. Practice blocks stay self-contained.
  const carry = mode === 'practice' ? '' : [...page.carry.values()].join(' ');
  const res = runBlock(code, flags, carry);
  if (mode !== 'practice') {
    for (const p of splitStatements(code).map(classify)) {
      const d = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*db\.getSiblingDB\(/.exec(p.code);
      const fn = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([\w\s,]*\)|[\w$]+)\s*=>/.exec(p.code);
      if (p.kind === 'raw' && d) page.carry.set(d[1], p.code);
      else if (p.kind === 'raw' && fn) page.carry.set(fn[1], p.code);
    }
  }
  if (res.errors.length === 0 && wantsError) throw new Error(`${where}: expected an error but none occurred\n--- code:\n${code}`);
  if (res.errors.length > 0 && !wantsError) throw new Error(`${where}: unexpected error: ${res.errors[0]}\n--- code:\n${code}`);
  const out = formatOutput(res.outputs, maxLines);

  if (mode === 'expect') return `**Expected result:**\n\n${fence(out, 'text')}`;
  if (mode === 'practice') {
    const detail = (summary, inner) => `<details>\n<summary>${summary}</summary>\n\n${inner}\n\n</details>`;
    return ['**Your result should look like this:**', fence(out, 'text'), hint ? detail('Hint', hint) : null, detail('Show solution', fence(code))].filter(Boolean).join('\n\n');
  }
  if (flags.includes('noout')) return fence(body);
  return `${fence(body)}\n\n${out ? fence(out, 'text') : ''}`.trimEnd();
}

const scalarCache = new Map();
function inlineScalars(line, where) {
  return line.replace(/\{\{=\s*(.+?)\s*\}\}/g, (_, q) => {
    if (!scalarCache.has(q)) {
      const res = runBlock(`JSON.stringify(${q})`, []);
      if (res.errors.length || !res.outputs[0]) throw new Error(`${where}: inline query failed: ${q} ${res.errors[0] ?? ''}`);
      const v = res.outputs[0].text.join('').trim().replace(/^'(.*)'$/, '$1');
      scalarCache.set(q, v.replace(/^"(.*)"$/, '$1'));
    }
    return scalarCache.get(q);
  });
}

function runShell(script, where) {
  const r = spawnSync(GIT_BASH, ['-c', `set -e\n${script}`], {
    cwd: LAB_DIR, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' }, maxBuffer: 16 * 1024 * 1024,
  });
  for (const f of fs.readdirSync(LAB_DIR)) if (f.startsWith('backup_demo_')) fs.unlinkSync(path.join(LAB_DIR, f));
  const text = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0) throw new Error(`${where}: shell command failed (exit ${r.status}):\n${script}\n---\n${text}`);
  return `\`\`\`bash\n${script}\n\`\`\`${text ? `\n\n\`\`\`text\n${text}\n\`\`\`` : ''}`;
}

function renderTemplate(text, file) {
  const lines = text.split('\n');
  const out = [];
  const page = { dirty: false, carry: new Map() };
  const name = path.basename(file);
  let i = 0;
  let blockNo = 0;
  try {
    while (i < lines.length) {
      const m = /^```(js(?:\s+.*)?)\s*$/.exec(lines[i]);
      if (!m) {
        if (/^```bash\s+run\s*$/.test(lines[i])) {
          const script = [];
          i += 1;
          while (i < lines.length && !/^```\s*$/.test(lines[i])) { script.push(lines[i]); i += 1; }
          i += 1;
          blockNo += 1;
          page.dirty = true;
          out.push(runShell(script.join('\n'), `${name} block ${blockNo}`));
          continue;
        }
        if (/^```/.test(lines[i])) {
          out.push(lines[i]); i += 1;
          while (i < lines.length && !/^```\s*$/.test(lines[i])) { out.push(lines[i]); i += 1; }
          if (i < lines.length) { out.push(lines[i]); i += 1; }
          continue;
        }
        out.push(inlineScalars(lines[i], name)); i += 1; continue;
      }
      const info = m[1].trim();
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { body.push(lines[i]); i += 1; }
      i += 1;
      blockNo += 1;
      out.push(renderBlock(info, body.join('\n'), `${name} block ${blockNo}`, page));
    }
  } finally {
    if (page.dirty) resetLab();
  }
  return out.join('\n');
}

function withFrontmatter(rendered, file, allFiles) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(rendered);
  if (!m) throw new Error(`${path.basename(file)}: missing frontmatter`);
  const num = /^(\d+)-(\d+)-/.exec(path.basename(file));
  if (!num) throw new Error(`${path.basename(file)}: filename must be MM-PP-slug.md`);
  const title = /^title:\s*"(.*)"\s*$/m.exec(m[1])?.[1];
  const order = allFiles.indexOf(file) + 1;
  const result = `---\ntitle: "${title}"\norder: ${order}\n---\n${rendered.slice(m[0].length)}`;
  if (/pagila|sakila/i.test(result.replace(/sakilacustomer|sakilastaff|MySakila/gi, ''))) throw new Error(`${path.basename(file)}: the source dataset must not be named`);
  return result;
}

// ----------------------------------------------------------------------- main

const args = process.argv.slice(2);
const check = args.includes('--check');
const srcDir = path.join(HERE, 'src');
const pagesDir = path.join(HERE, 'pages');
const files = args.filter((a) => !a.startsWith('--')).map((f) => path.resolve(f));
const allFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.md')).sort().map((f) => path.join(srcDir, f));
const targets = files.length ? files : allFiles;

fs.mkdirSync(pagesDir, { recursive: true });
let drift = 0;
for (const file of targets) {
  const rendered = withFrontmatter(renderTemplate(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), file), file, allFiles);
  const dest = path.join(pagesDir, path.basename(file).replace(/\.md$/, '.mdx'));
  if (check) {
    const norm = (t) => t.replace(/\r\n/g, '\n').split('\n').map((l) => (/(executionTimeMillis|totalKeysExamined|nanos|millis|"ms"|secs_running|uptime)/i.test(l) ? l.replace(/\d+/g, '#') : l)).join('\n');
    const same = fs.existsSync(dest) && norm(fs.readFileSync(dest, 'utf8')) === norm(rendered);
    console.log(`${same ? 'OK   ' : 'DRIFT'} ${path.basename(dest)}`);
    if (!same) drift += 1;
  } else {
    fs.writeFileSync(dest, rendered);
    console.log(`rendered ${path.basename(dest)}`);
  }
}
if (check && drift) process.exit(1);
