#!/usr/bin/env node
/**
 * PostgreSQL Commands course — page renderer.
 *
 * Templates in ./src/*.md hold prose plus fenced ```sql blocks. Every block is
 * EXECUTED against the live PostgreSQL container (sypher-db-lab) and the real
 * result is written into ./pages/*.mdx, so no number or table in the course is
 * ever typed by hand. Any unexpected SQL error fails the render.
 *
 * Fence info strings (after `sql`):
 *   run                 show the SQL, then the real result table(s)
 *   run rows=8          show up to 8 rows (default 5), with a "first N of M" caption
 *   run error           the block MUST fail; show the SQL and the real error text
 *   run destructive     block changes data; the lab DB is restored afterwards and
 *                       verified against the baseline checksums
 *   run notices         also show NOTICE messages the statements raised
 *   run raw             show each row as "column: value" lines
 *   run noout           run it (must succeed) but do not print the result
 *   run as=<role>       run as that role (default `sypher`)
 *   practice            expected-result table + hidden hint + hidden solution
 *                       (lines starting `-- hint:` become the hint, not solution)
 *   expect              result only (final project)
 *   show                just display the SQL, never executed
 *   timeline            several live sessions ("A> stmt" / "B> stmt" lines)
 * ```psql               a real psql session (meta-commands like \d, \x), output shown as text
 * ```bash run           a real host shell command in the lab folder
 * {{= SELECT ... }}     inline scalar from a real query
 *
 * Usage (from apps/web/scratch/postgresql-commands):
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
const DB = 'sypher-postgresql-DvdRental';
const DEFAULT_ROWS = 5;

// ---------------------------------------------------------------- SQL running

/**
 * Split into statements on `;` (respects '...' and E'...' strings, "..." identifiers,
 * $tag$...$tag$ dollar quotes, -- and nested block comments). A line starting with a
 * backslash is a psql meta-command and is its own statement. Returns [{ text, meta }].
 */
function splitStatements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (cur.trim() === '' && c === '\\' && (i === 0 || sql[i - 1] === '\n' || /^\s*$/.test(sql.slice(sql.lastIndexOf('\n', i - 1) + 1, i)))) {
      let end = sql.indexOf('\n', i);
      if (end < 0) end = sql.length;
      out.push({ text: sql.slice(i, end).trim(), meta: true });
      cur = ''; i = end + 1; continue;
    }
    if (c === '-' && n === '-') { while (i < sql.length && sql[i] !== '\n') i += 1; continue; }
    if (c === '/' && n === '*') {
      let depth = 1; i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth += 1; i += 2; } else if (sql[i] === '*' && sql[i + 1] === '/') { depth -= 1; i += 2; } else i += 1;
      }
      continue;
    }
    if (c === "'") {
      const esc = /[eE]$/.test(cur) && !/[A-Za-z0-9_]$/.test(cur.slice(0, -1));
      cur += c; i += 1;
      while (i < sql.length) {
        if (esc && sql[i] === '\\') { cur += sql[i] + (sql[i + 1] ?? ''); i += 2; continue; }
        if (sql[i] === "'" && sql[i + 1] === "'") { cur += "''"; i += 2; continue; }
        cur += sql[i]; i += 1;
        if (sql[i - 1] === "'") break;
      }
      continue;
    }
    if (c === '"') {
      cur += c; i += 1;
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') { cur += '""'; i += 2; continue; }
        cur += sql[i]; i += 1;
        if (sql[i - 1] === '"') break;
      }
      continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m && !/[A-Za-z0-9_]$/.test(cur)) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end < 0 ? sql.length : end + tag.length;
        cur += sql.slice(i, stop); i = stop; continue;
      }
    }
    if (c === ';') {
      if (cur.trim()) out.push({ text: `${cur.trim()};`, meta: false });
      cur = ''; i += 1; continue;
    }
    cur += c; i += 1;
  }
  if (cur.trim()) out.push({ text: `${cur.trim()};`, meta: false });
  return out;
}

/** Parse psql --csv output (quoted fields, embedded newlines) into rows of strings. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 1; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

const psqlArgs = (user, csv = true) => ['compose', 'exec', '-T', 'postgres', 'psql', '-X', '-q', ...(csv ? ['--csv'] : []), '-P', 'pager=off', '-P', 'null=NULL', '-v', 'ON_ERROR_STOP=0', '-U', user, '-d', DB];

const isWelcome = (l) => /welcome to pagila/i.test(l);
/** stderr lines -> { error, notices } */
function readErr(lines) {
  // "Failing row contains (..., <last_update timestamp>)" would change on every run; show a stable placeholder.
  const stable = (l) => (/^DETAIL:\s+Failing row contains/.test(l) ? l.replace(/\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(\.\d+)?/g, '(current time)') : l);
  const clean = lines.map((l) => stable(l.replace(/^psql:<stdin>:\d+: /, ''))).filter((l) => l !== '' && !isWelcome(l) && !/^(WARNING|HINT: {2}Use)/.test(l));
  const iErr = clean.findIndex((l) => /^(ERROR|FATAL):/.test(l));
  const notices = [];
  for (let k = 0; k < clean.length; k += 1) if (/^NOTICE:/.test(clean[k]) && (iErr < 0 || k < iErr)) notices.push(clean[k]);
  return { error: iErr >= 0 ? clean.slice(iErr).join('\n') : null, notices };
}

/** Run statements in ONE psql session; returns per statement { header, rows, sql } | { error } | { text }. */
function runSql(sql, user = 'sypher') {
  const stmts = splitStatements(sql);
  const script = [
    ...stmts.flatMap((st, i) => [
      ...(st.meta ? ['\\pset format aligned'] : []),
      st.text,
      ...(st.meta ? ['\\pset format csv'] : []),
      `\\echo @@S${i}@@`,
      `\\warn @@S${i}@@`,
    ]),
  ].join('\n');
  const r = spawnSync('docker', psqlArgs(user), { cwd: LAB_DIR, input: `${script}\n`, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !/@@S0@@/.test(r.stdout || '') && stmts.length) {
    throw new Error(`psql failed: ${(r.stderr || '').split('\n').filter((l) => !isWelcome(l)).join('\n')}`);
  }
  const seg = (streamText) => {
    const parts = new Map();
    let buf = [];
    for (const line of (streamText || '').split('\n')) {
      const m = /^@@S(\d+)@@\r?$/.exec(line);
      if (m) { parts.set(Number(m[1]), buf); buf = []; } else buf.push(line);
    }
    return parts;
  };
  const outSeg = seg(r.stdout);
  const errSeg = seg(r.stderr);
  return stmts.map((st, i) => {
    const s = st.text;
    const { error, notices } = readErr(errSeg.get(i) ?? []);
    if (error) return { error, sql: s };
    const lines = outSeg.get(i) ?? [];
    if (st.meta) return { text: lines.join('\n').replace(/\s+$/, ''), sql: s, notices };
    const body = lines.join('\n');
    if (body.trim() === '') return { header: null, rows: [], sql: s, notices };
    const rows = parseCsv(body);
    return { header: rows[0], rows: rows.slice(1), sql: s, notices };
  });
}

/** ```psql block: the whole body runs as one interactive-style psql session; output is the raw text. */
function runPsql(body, user = 'sypher') {
  const r = spawnSync('docker', psqlArgs(user, false), { cwd: LAB_DIR, input: `${body}\n`, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const text = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => !isWelcome(l)).map((l) => l.replace(/^psql:<stdin>:\d+: /, '')).join('\n').replace(/\s+$/, '');
  return text;
}

function resetLab() {
  const r = spawnSync(GIT_BASH, ['scripts/reset-postgres.sh'], { cwd: LAB_DIR, encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || !text.includes('RESTORED')) throw new Error(`Lab restore FAILED:\n${text}`);
}

// ------------------------------------------------------------------ rendering

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function table(res, limit) {
  const numeric = res.header.map((_, c) => res.rows.length > 0 && res.rows.every((r) => r[c] !== 'NULL' && r[c] !== '' && !Number.isNaN(Number(r[c]))));
  const shown = res.rows.slice(0, limit);
  const lines = [
    `| ${res.header.map(esc).join(' | ')} |`,
    `|${numeric.map((n) => (n ? '---:' : '---')).join('|')}|`,
    ...shown.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ];
  if (res.rows.length > limit) lines.push(`| ${res.header.map(() => '…').join(' | ')} |`);
  const total = res.rows.length;
  const caption = total === 0 ? '*No rows returned.*'
    : total > limit ? `*Showing the first ${limit} of ${total} rows.*`
    : `*${total} row${total === 1 ? '' : 's'} returned.*`;
  return `${lines.join('\n')}\n\n${caption}`;
}

const fence = (sql, lang = 'sql') => `\`\`\`${lang}\n${sql.trim()}\n\`\`\``;
const isExplain = (s) => /^\s*explain\b/i.test(s);

function resultsMarkdown(results, limit, raw, showNotices) {
  const parts = [];
  for (const res of results) {
    if (res.error) { parts.push(fence(res.error, 'text')); continue; }
    if (showNotices && res.notices?.length) parts.push(fence(res.notices.join('\n'), 'text'));
    if (res.text !== undefined) { if (res.text) parts.push(fence(res.text, 'text')); continue; }
    if (res.header && isExplain(res.sql)) { parts.push(fence(res.rows.map((r) => r[0]).join('\n'), 'text')); continue; }
    if (res.header && raw) {
      parts.push(fence(res.rows.map((r) => res.header.map((h, i) => `${h}: ${r[i]}`).join('\n')).join('\n\n'), 'text'));
      continue;
    }
    if (res.header) parts.push(table(res, limit));
  }
  return parts.join('\n\n');
}

/**
 * ```sql timeline  — several live sessions, one statement per line: "A> stmt" / "B> stmt".
 * Continuation lines (no "X> " prefix) extend the previous statement. Rendered as a table
 * (step, session A, session B) with each statement's real result. A statement that waits on
 * a lock is marked as waiting. Flag `error` = errors expected; `reveal` hides it in <details>.
 */
function renderTimeline(body, flags, where, page) {
  const steps = [];
  for (const line of body.split('\n')) {
    const m = /^([A-Z])>\s?(.*)$/.exec(line);
    if (m) steps.push({ session: m[1], sql: m[2] });
    else if (line.trim() && steps.length) steps[steps.length - 1].sql += ` ${line.trim()}`;
  }
  page.dirty = true;
  const r = spawnSync(process.execPath, [path.join(HERE, 'timeline.mjs')], {
    cwd: LAB_DIR, input: JSON.stringify({ steps }), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`${where}: timeline failed: ${r.stderr}`);
  const results = JSON.parse(r.stdout);
  const wantsError = flags.includes('error');
  const errors = results.filter((s) => s.error);
  if (wantsError ? errors.length === 0 : errors.length > 0) {
    throw new Error(`${where}: timeline ${wantsError ? 'expected an error but none occurred' : `unexpected error: ${errors[0].error}`}`);
  }
  const names = [...new Set(results.map((s) => s.session))].sort();
  const short = (v) => (v.length > 60 ? `${v.slice(0, 57)}...` : v);
  const outcome = (s) => {
    if (s.error) return `→ **${esc(s.error.split('\n')[0].replace(/^ERROR:\s+/, 'ERROR: '))}**`;
    if (!s.header) return s.blocked ? '→ ⏳ *waited for a lock, then ran*' : '';
    let text;
    if (s.rows.length === 0) text = '*(no rows)*';
    else if (s.header.length === 1) text = s.rows.slice(0, 6).map((r) => `**${esc(short(r[0]))}**`).join(', ');
    else text = s.rows.slice(0, 4).map((r) => s.header.map((h, i) => `${esc(h)}=**${esc(short(r[i]))}**`).join(', ')).join('; ');
    return `→ ${text}${s.blocked ? ' *(after waiting)*' : ''}`;
  };
  const codeLines = (sqlText) => {
    const MAX = 44;
    if (sqlText.length <= MAX) return `\`${sqlText}\``;
    const cut = sqlText.lastIndexOf(' ', Math.min(sqlText.length - 8, Math.max(MAX, Math.floor(sqlText.length / 2))));
    const at = cut > 12 ? cut : sqlText.indexOf(' ', 12);
    if (at < 0) return `\`${sqlText}\``;
    return `\`${sqlText.slice(0, at)}\`<br>\`${sqlText.slice(at + 1)}\``;
  };
  const cell = (s) => {
    const sqlText = esc(s.sql.replace(/\s+/g, ' ').trim()).replace(/`/g, "'");
    const res = outcome(s);
    return `${codeLines(sqlText)}${res ? `<br>${res}` : ''}${s.blocked && !res ? '<br>→ ⏳ *waiting*' : ''}`;
  };
  const rows = results.map((s, i) => `| ${i + 1} | ${names.map((n) => (n === s.session ? cell(s) : '')).join(' | ')} |`);
  const tableMd = [`| Step | ${names.map((n) => `Session ${n}${n === 'R' ? ' (admin)' : ''}`).join(' | ')} |`, `|---:|${names.map(() => '---').join('|')}|`, ...rows].join('\n');
  return flags.includes('reveal') ? `<details>\n<summary>Check your result</summary>\n\n${tableMd}\n\n</details>` : tableMd;
}

function renderBlock(info, body, where, page) {
  const flags = info.split(/\s+/).slice(1);
  const mode = flags[0];
  const rowsFlag = flags.find((f) => f.startsWith('rows='));
  const limit = rowsFlag ? Number(rowsFlag.slice(5)) : DEFAULT_ROWS;
  const wantsError = flags.includes('error');
  const destructive = flags.includes('destructive');

  if (mode === 'timeline') return renderTimeline(body, flags, where, page);
  if (mode === 'show') return fence(body);

  let hint = null;
  let sql = body;
  if (mode === 'practice') {
    const hintLines = [];
    sql = body.split('\n').filter((l) => {
      const m = /^--\s*hint:\s*(.*)$/.exec(l.trim());
      if (m) { hintLines.push(m[1]); return false; }
      return true;
    }).join('\n');
    hint = hintLines.join(' ');
  }

  if (destructive) page.dirty = true;
  const asFlag = flags.find((f) => f.startsWith('as='));
  const results = runSql(sql, asFlag ? asFlag.slice(3) : 'sypher');

  const errors = results.filter((r) => r.error);
  if (wantsError ? errors.length === 0 : errors.length > 0) {
    throw new Error(`${where}: ${wantsError ? 'expected an SQL error but none occurred' : `unexpected SQL error: ${errors[0].error}`}\n--- SQL:\n${sql}`);
  }
  if (mode === 'expect') {
    const lastSet = [...results].reverse().find((r) => r.header);
    if (!lastSet) throw new Error(`${where}: expect block returned no result set`);
    const total = lastSet.rows.length;
    return `**Expected result** (${total} row${total === 1 ? '' : 's'} in total${total > limit ? `, first ${limit} shown` : ''}):\n\n${table(lastSet, limit)}`;
  }
  if (mode === 'practice') {
    const last = [...results].reverse().find((r) => r.header);
    if (!last) throw new Error(`${where}: practice block returned no result set`);
    const detail = (summary, inner) => `<details>\n<summary>${summary}</summary>\n\n${inner}\n\n</details>`;
    const shownResult = isExplain(last.sql) ? fence(last.rows.map((r) => r[0]).join('\n'), 'text') : table(last, limit);
    return [
      '**Your result should look like this:**',
      shownResult,
      hint ? detail('Hint', hint) : null,
      detail('Show solution', fence(sql)),
    ].filter(Boolean).join('\n\n');
  }
  if (flags.includes('noout')) return fence(body);
  return `${fence(body)}\n\n${resultsMarkdown(results, limit, flags.includes('raw'), flags.includes('notices'))}`.trimEnd();
}

const scalarCache = new Map();
function inlineScalars(line, where) {
  return line.replace(/\{\{=\s*(.+?)\s*\}\}/g, (_, q) => {
    if (!scalarCache.has(q)) {
      const [res] = runSql(q);
      if (!res || res.error || !res.rows.length) throw new Error(`${where}: inline query failed: ${q} ${res?.error ?? ''}`);
      scalarCache.set(q, res.rows[0][0]);
    }
    return scalarCache.get(q);
  });
}

function runShell(script, where) {
  const r = spawnSync(GIT_BASH, ['-c', `set -e\n${script}`], {
    cwd: LAB_DIR, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' }, maxBuffer: 16 * 1024 * 1024,
  });
  for (const f of fs.readdirSync(LAB_DIR)) if (f.startsWith('backup_demo_')) fs.unlinkSync(path.join(LAB_DIR, f));
  const text = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => !isWelcome(l)).join('\n').trim();
  if (r.status !== 0) throw new Error(`${where}: shell command failed (exit ${r.status}):\n${script}\n---\n${text}`);
  return `\`\`\`bash\n${script}\n\`\`\`${text ? `\n\n\`\`\`text\n${text}\n\`\`\`` : ''}`;
}

function renderTemplate(text, file) {
  const lines = text.split('\n');
  const out = [];
  const page = { dirty: false };
  const name = path.basename(file);
  let i = 0;
  let blockNo = 0;
  try {
    while (i < lines.length) {
      const m = /^```(sql(?:\s+.*)?)\s*$/.exec(lines[i]);
      if (!m) {
        if (/^```psql(\s+.*)?$/.test(lines[i])) {
          const flags = lines[i].replace(/^```psql/, '').trim().split(/\s+/);
          const script = [];
          i += 1;
          while (i < lines.length && !/^```\s*$/.test(lines[i])) { script.push(lines[i]); i += 1; }
          i += 1;
          blockNo += 1;
          if (flags.includes('destructive')) page.dirty = true;
          const output = runPsql(script.join('\n'));
          out.push(`\`\`\`text\n${script.join('\n')}\n\`\`\``);
          if (output && !flags.includes('noout')) out.push(`\`\`\`text\n${output}\n\`\`\``);
          continue;
        }
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
  if (/pagila/i.test(result)) throw new Error(`${path.basename(file)}: the word "Pagila" must not appear in the course`);
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
    // Planner cost/time numbers vary slightly between runs: ignore digits on those lines.
    const norm = (t) => t.replace(/\r\n/g, '\n').split('\n')
      .map((l) => (/(cost=|actual time=|Execution Time|Planning Time|Buffers:|Heap Fetches|Memory:|Sort Method|Rows Removed|Size:)/.test(l) ? l.replace(/\d+/g, '#') : l)).join('\n');
    const same = fs.existsSync(dest) && norm(fs.readFileSync(dest, 'utf8')) === norm(rendered);
    console.log(`${same ? 'OK   ' : 'DRIFT'} ${path.basename(dest)}`);
    if (!same) drift += 1;
  } else {
    fs.writeFileSync(dest, rendered);
    console.log(`rendered ${path.basename(dest)}`);
  }
}
if (check && drift) process.exit(1);
