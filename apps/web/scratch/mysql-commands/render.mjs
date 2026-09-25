#!/usr/bin/env node
/**
 * MySQL Commands course — page renderer.
 *
 * Templates in ./src/*.md hold prose plus fenced ```sql blocks. Every block is
 * EXECUTED against the live Sakila MySQL container (sypher-db-lab) and the real
 * result is written into ./pages/*.mdx, so no number or table in the course is
 * ever typed by hand. Any unexpected SQL error fails the render.
 *
 * Fence info strings (after `sql`):
 *   run                 show the SQL, then the real result table(s)
 *   run rows=8          show up to 8 rows (default 5), with a "first N of M" caption
 *   run error           the block MUST fail; show the SQL and the real error text
 *   run destructive     block changes data; the lab DB is restored afterwards and
 *                       verified against the baseline checksums
 *   practice            expected-result table + hidden hint + hidden solution
 *                       (lines starting `-- hint:` become the hint, not solution)
 *   show                just display the SQL, never executed (syntax boxes)
 *
 * Usage (from apps/web/scratch/mysql-commands):
 *   node render.mjs                render every src/*.md -> pages/*.mdx
 *   node render.mjs src/01-x.md    render one
 *   node render.mjs --check        re-render in memory and fail if pages/ drifted
 *
 * Env: LAB_DIR (default H:/Abhishek/DB/sypher-db-lab), GIT_BASH.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = process.env.LAB_DIR || 'H:/Abhishek/DB/sypher-db-lab';
const GIT_BASH = process.env.GIT_BASH || 'C:/Program Files/Git/bin/bash.exe';
const DEFAULT_ROWS = 5;

// ---------------------------------------------------------------- SQL running

/**
 * Split into statements on the current delimiter (respects quotes, backticks, comments).
 * Understands `DELIMITER $$` lines, so stored programs with inner semicolons work.
 * Returns [{ text, delim }].
 */
function splitStatements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  let quote = null;
  let delim = ';';
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (quote) {
      cur += c;
      if (c === '\\' && quote !== '`') { cur += n ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1; continue;
    }
    if (cur.trim() === '' && (i === 0 || sql[i - 1] === '\n')) {
      const dm = /^DELIMITER[ \t]+(\S+)[ \t]*(?:\r?\n|$)/i.exec(sql.slice(i));
      if (dm) { delim = dm[1]; cur = ''; i += dm[0].length; continue; }
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; i += 1; continue; }
    if (c === '-' && n === '-' && (sql[i + 2] === ' ' || sql[i + 2] === '\n' || i + 2 >= sql.length)) {
      while (i < sql.length && sql[i] !== '\n') i += 1; // drop comment
      continue;
    }
    if (c === '/' && n === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2; continue;
    }
    if (sql.startsWith(delim, i)) {
      if (cur.trim()) out.push({ text: cur.trim(), delim });
      cur = ''; i += delim.length; continue;
    }
    cur += c; i += 1;
  }
  if (cur.trim()) out.push({ text: cur.trim(), delim });
  return out;
}

const unescapeBatch = (s) => s.replace(/\\(t|n|\\|0)/g, (_, k) => ({ t: '\t', n: '\n', '\\': '\\', 0: '\0' })[k]);

/** Run statements in ONE mysql session; returns [{ header, rows } | { error }] per statement. */
function runSql(sql, user = 'sypher') {
  const stmts = splitStatements(sql);
  const wrap = (st) => (st.delim === ';' ? `${st.text};` : `DELIMITER ${st.delim}\n${st.text}${st.delim}\nDELIMITER ;`);
  const script = stmts.map((st, i) => `${wrap(st)}\nSELECT '@@S${i}@@';`).join('\n');
  const r = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'mysql', 'sh', '-c',
      `mysql -u${user} -ppassword -B -n --force --default-character-set=utf8mb4 sypher-mysql-DvdRental 2>&1`],
    { cwd: LAB_DIR, input: script, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.status !== 0 && !r.stdout) throw new Error(`docker failed: ${r.stderr}`);
  const results = [];
  let seg = [];
  let closed = -1;
  for (const raw of r.stdout.split(/\r?\n/)) {
    if (raw.includes('Using a password on the command line')) continue;
    const m = /^@@S(\d+)@@$/.exec(raw);
    if (m) {
      const idx = Number(m[1]);
      if (idx === closed) continue; // marker's value row (header row closed it)
      closed = idx;
      results[idx] = seg;
      seg = [];
      continue;
    }
    if (raw !== '') seg.push(raw);
  }
  return stmts.map((st, i) => {
    const s = st.text;
    const lines = results[i] ?? [];
    const err = lines.find((l) => l.startsWith('ERROR '));
    if (err) return { error: err.replace(/ at line \d+/, ''), sql: s };
    if (lines.length === 0) return { header: null, rows: [], sql: s };
    return {
      header: lines[0].split('\t').map(unescapeBatch),
      rows: lines.slice(1).map((l) => l.split('\t').map(unescapeBatch)),
      sql: s,
    };
  });
}

function resetLab() {
  const r = spawnSync(GIT_BASH, ['scripts/reset-mysql.sh'], { cwd: LAB_DIR, encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || !text.includes('RESTORED')) throw new Error(`Lab restore FAILED:\n${text}`);
}

// ------------------------------------------------------------------ rendering

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/**
 * EXPLAIN output has 12 columns, which is wider than the course reader's article column,
 * and the columns that get cut off (rows, Extra) are the ones the lessons teach. Drop the
 * ones no lesson uses (`partitions`, `filtered`, and `select_type` when it is always SIMPLE).
 */
function slimExplain(res) {
  if (!res.header.includes('select_type') || !res.header.includes('partitions')) return res;
  const drop = new Set(['partitions', 'filtered']);
  const st = res.header.indexOf('select_type');
  if (res.rows.every((r) => r[st] === 'SIMPLE')) drop.add('select_type');
  const keep = res.header.map((h) => !drop.has(h));
  return { ...res, header: res.header.filter((_, i) => keep[i]), rows: res.rows.map((r) => r.filter((_, i) => keep[i])) };
}

/** SHOW INDEX has 15 columns; the lessons only use these six. */
function slimShowIndex(res) {
  if (!res.header.includes('Key_name') || !res.header.includes('Seq_in_index')) return res;
  const wanted = ['Table', 'Non_unique', 'Key_name', 'Seq_in_index', 'Column_name', 'Index_type'];
  const idx = wanted.map((h) => res.header.indexOf(h)).filter((i) => i >= 0);
  return { ...res, header: idx.map((i) => res.header[i]), rows: res.rows.map((r) => idx.map((i) => r[i])) };
}

function table(res, limit) {
  res = slimShowIndex(slimExplain(res));
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

const fence = (sql) => `\`\`\`sql\n${sql.trim()}\n\`\`\``;

function resultsMarkdown(results, limit, where, raw) {
  const parts = [];
  for (const res of results) {
    if (res.error) { parts.push(`\`\`\`text\n${res.error}\n\`\`\``); continue; }
    if (res.header && raw) {
      const text = res.rows.map((r) => res.header.map((h, i) => `${h}: ${r[i]}`).join('\n')).join('\n\n');
      parts.push(`\`\`\`text\n${text}\n\`\`\``);
      continue;
    }
    if (res.header) parts.push(table(res, limit));
    // mysql -B prints nothing at all for an empty SELECT, so say so explicitly.
    else if (/^\s*(select|with|show|describe|desc|explain|\()/i.test(res.sql) && !/\binto\s+@/i.test(res.sql)) parts.push('*No rows returned.*');
  }
  return parts.join('\n\n');
}

/**
 * ```sql timeline  — several live sessions, one statement per line: "A> stmt" / "B> stmt".
 * Continuation lines (no "X> " prefix) extend the previous statement. Rendered as a
 * three-column table (step, session A, session B) with each statement's real result.
 * A statement that waits on a lock is marked as waiting. Flag `error` = errors expected.
 */
function renderTimeline(body, flags, where, page) {
  const steps = [];
  for (const line of body.split('\n')) {
    const m = /^([A-Z])>\s?(.*)$/.exec(line);
    if (m) steps.push({ session: m[1], sql: m[2] });
    else if (line.trim() && steps.length) steps[steps.length - 1].sql += ` ${line.trim()}`;
  }
  page.dirty = true; // sessions may commit changes; always restore afterwards
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
    if (s.error) return `→ **${esc(s.error.replace(/^ERROR (\d+) \(\w+\): /, 'ERROR $1: '))}**`;
    if (!s.header) return s.blocked ? '→ ⏳ *waited for a lock, then ran*' : '';
    let text;
    if (s.rows.length === 0) text = '*(no rows)*';
    else if (s.header.length === 1) text = s.rows.slice(0, 6).map((r) => `**${esc(short(r[0]))}**`).join(', ');
    else text = s.rows.slice(0, 4).map((r) => s.header.map((h, i) => `${esc(h)}=**${esc(short(r[i]))}**`).join(', ')).join('; ');
    return `→ ${text}${s.blocked ? ' *(after waiting)*' : ''}`;
  };
  // Long statements are broken into two lines (at a space near the middle) so they are not
  // clipped by the article column; each line is its own code span.
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
  // `reveal`: hide the real result behind a click, for practice problems.
  return flags.includes('reveal') ? `<details>\n<summary>Check your result</summary>\n\n${tableMd}\n\n</details>` : tableMd;
}

function renderBlock(info, body, where, page) {
  const flags = info.split(/\s+/).slice(1); // after "sql"
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

  if (destructive) page.dirty = true; // set BEFORE running: a failing block must still trigger the restore
  // `as=<user>`: run as that account (default `sypher`). Lesson-created users all use password "password".
  const asFlag = flags.find((f) => f.startsWith('as='));
  const results = runSql(sql, asFlag ? asFlag.slice(3) : 'sypher');

  const errors = results.filter((r) => r.error);
  if (wantsError ? errors.length === 0 : errors.length > 0) {
    throw new Error(`${where}: ${wantsError ? 'expected an SQL error but none occurred' : `unexpected SQL error: ${errors[0].error}`}\n--- SQL:\n${sql}`);
  }
  if (mode === 'expect') {
    // Result only, the SQL stays hidden (final project: "your result should look like this").
    const lastSet = [...results].reverse().find((r) => r.header);
    if (!lastSet) throw new Error(`${where}: expect block returned no result set`);
    const total = lastSet.rows.length;
    return `**Expected result** (${total} row${total === 1 ? '' : 's'} in total${total > limit ? `, first ${limit} shown` : ''}):\n\n${table(lastSet, limit)}`;
  }
  if (mode === 'practice') {
    const last = [...results].reverse().find((r) => r.header);
    if (!last) throw new Error(`${where}: practice block returned no result set`);
    const detail = (summary, inner) => `<details>\n<summary>${summary}</summary>\n\n${inner}\n\n</details>`;
    return [
      '**Your result should look like this:**',
      table(last, limit),
      hint ? detail('Hint', hint) : null,
      detail('Show solution', fence(sql)),
    ].filter(Boolean).join('\n\n');
  }
  // `noout`: the statement ran (and must succeed) but its output is not shown (e.g. timings vary per run).
  if (flags.includes('noout')) return fence(body);
  return `${fence(body)}\n\n${resultsMarkdown(results, limit, where, flags.includes('raw'))}`.trimEnd();
}

const scalarCache = new Map();
/** Replace {{= SELECT ... }} in prose with the first cell of the real result. */
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
  const text = `${r.stdout || ''}${r.stderr || ''}`.split('\n')
    .filter((l) => !l.includes('Using a password on the command line')).join('\n').trim();
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
        if (/^```bash\s+run\s*$/.test(lines[i])) {
          // ```bash run — a real shell script, executed on the host (Git Bash) in the lab folder.
          // Its output is shown under the command. Files named backup_demo_* are removed afterwards.
          const script = [];
          i += 1;
          while (i < lines.length && !/^```\s*$/.test(lines[i])) { script.push(lines[i]); i += 1; }
          i += 1;
          blockNo += 1;
          page.dirty = true; // shell steps may create databases/tables; restore afterwards
          out.push(runShell(script.join('\n'), `${name} block ${blockNo}`));
          continue;
        }
        if (/^```/.test(lines[i])) { // non-sql fence (bash, text): copy verbatim
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
      i += 1; // closing fence
      blockNo += 1;
      out.push(renderBlock(info, body.join('\n'), `${name} block ${blockNo}`, page));
    }
  } finally {
    // Once per page, after the last data-changing block. In `finally` so the lab is
    // restored even when a block throws halfway through (page.dirty is set BEFORE running).
    if (page.dirty) resetLab();
  }
  return out.join('\n');
}

/** "03-09-not.md" -> title as authored (no "3.9" prefix), order = position in the full src list. */
function withFrontmatter(rendered, file, allFiles) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(rendered);
  if (!m) throw new Error(`${path.basename(file)}: missing frontmatter`);
  const num = /^(\d+)-(\d+)-/.exec(path.basename(file));
  if (!num) throw new Error(`${path.basename(file)}: filename must be MM-PP-slug.md`);
  const title = /^title:\s*"(.*)"\s*$/m.exec(m[1])?.[1];
  const order = allFiles.indexOf(file) + 1;
  return `---\ntitle: "${title}"\norder: ${order}\n---\n${rendered.slice(m[0].length)}`;
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
    // EXPLAIN's `rows` is a sampled estimate that varies slightly between runs on freshly
    // created tables, so digits inside EXPLAIN table rows (12+ columns) are ignored when comparing.
    const norm = (t) => t.replace(/\r\n/g, '\n').split('\n')
      .map((l) => ((l.startsWith('|') && l.split('|').length > 9) || /\(cost=[\d.e+]+ rows=\d+\)/.test(l) ? l.replace(/\d+/g, '#') : l)).join('\n');
    const same = fs.existsSync(dest) && norm(fs.readFileSync(dest, 'utf8')) === norm(rendered);
    console.log(`${same ? 'OK   ' : 'DRIFT'} ${path.basename(dest)}`);
    if (!same) drift += 1;
  } else {
    fs.writeFileSync(dest, rendered);
    console.log(`rendered ${path.basename(dest)}`);
  }
}
if (check && drift) process.exit(1);
