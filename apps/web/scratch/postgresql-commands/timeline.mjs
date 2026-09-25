#!/usr/bin/env node
/**
 * Multi-session runner for `sql timeline` blocks (PostgreSQL).
 *
 * Reads JSON from stdin: { steps: [{ session: "A", sql: "..." }, ...] }
 * Opens one live psql client per session name (each a real, separate connection),
 * runs the steps in the given order, and prints JSON:
 *   [{ session, sql, header, rows, error, blocked }]
 *
 * A step that has not finished after BLOCK_MS is treated as BLOCKED (waiting on a
 * lock): the runner moves on to the next step, and the blocked statement's result
 * is collected when it eventually completes (e.g. after another session commits).
 * Session "R" is an ordinary session used by the "administrator" in diagnostics lessons.
 */
import { spawn } from 'child_process';

const LAB_DIR = process.env.LAB_DIR || 'H:/Abhishek/DB/sypher-db-lab';
const DB = 'sypher-postgresql-DvdRental';
const BLOCK_MS = Number(process.env.TIMELINE_BLOCK_MS || 3500);
const FINISH_MS = 25000;

function parseCsv(text) {
  const rows = [];
  let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 1; } else q = false; } else f += c; } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f !== '' || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function openSession(name) {
  const proc = spawn('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-X', '-q', '--csv', '-P', 'pager=off', '-P', 'null=NULL', '-v', 'ON_ERROR_STOP=0', '-U', 'sypher', '-d', DB], { cwd: LAB_DIR });
  const s = { name, proc, out: '', err: '', outSeg: new Map(), errSeg: new Map(), waiters: new Map() };
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  const pump = (kind) => (chunk) => {
    s[kind] += chunk;
    let nl;
    while ((nl = s[kind].indexOf('\n')) >= 0) {
      const line = s[kind].slice(0, nl).replace(/\r$/, '');
      s[kind] = s[kind].slice(nl + 1);
      const m = /^@@E(\d+)@@$/.exec(line);
      const segKey = kind === 'out' ? 'outSeg' : 'errSeg';
      if (m) {
        const n = Number(m[1]);
        s[segKey].set(n, s[`${kind}Buf`] ?? []);
        s[`${kind}Buf`] = [];
        check(s, n);
      } else {
        (s[`${kind}Buf`] ??= []).push(line);
      }
    }
  };
  proc.stdout.on('data', pump('out'));
  proc.stderr.on('data', pump('err'));
  return s;
}

function check(s, n) {
  if (s.outSeg.has(n) && s.errSeg.has(n) && s.waiters.has(n)) s.waiters.get(n)({ out: s.outSeg.get(n), err: s.errSeg.get(n) });
}

function send(s, n, sql) {
  const p = new Promise((resolve) => { s.waiters.set(n, resolve); check(s, n); });
  s.proc.stdin.write(`${sql.replace(/;\s*$/, '')};\n\\echo @@E${n}@@\n\\warn @@E${n}@@\n`);
  return p;
}

const isWelcome = (l) => /welcome to pagila/i.test(l);
const parse = ({ out, err }) => {
  const clean = err.map((l) => l.replace(/^psql:<stdin>:\d+: /, '')).filter((l) => l !== '' && !isWelcome(l) && !/^(NOTICE|WARNING):/.test(l));
  const i = clean.findIndex((l) => /^ERROR:/.test(l));
  if (i >= 0) return { error: clean.slice(i).join('\n') };
  const body = out.join('\n');
  if (body.trim() === '') return { header: null, rows: [] };
  const rows = parseCsv(body);
  return { header: rows[0], rows: rows.slice(1) };
};

async function main() {
  let input = '';
  for await (const c of process.stdin) input += c;
  const { steps } = JSON.parse(input);
  const sessions = new Map();
  const results = new Array(steps.length);
  const pending = [];

  // Open every session and warm it up BEFORE the timed steps (connection start-up must not look like a lock wait).
  const names = [...new Set(steps.map((st) => st.session))];
  await Promise.all(names.map(async (name, idx) => {
    const s = openSession(name);
    sessions.set(name, s);
    await send(s, 1000000 + idx, 'SELECT 1');
  }));

  for (let i = 0; i < steps.length; i += 1) {
    const st = steps[i];
    const s = sessions.get(st.session);
    const promise = send(s, i, st.sql).then((seg) => { results[i] = { ...parse(seg), blocked: results[i]?.blocked ?? false }; });
    const outcome = await Promise.race([promise.then(() => 'done'), new Promise((r) => setTimeout(() => r('blocked'), BLOCK_MS))]);
    if (outcome === 'blocked') { results[i] = { header: null, rows: [], blocked: true }; pending.push(promise); }
  }

  await Promise.race([
    Promise.all(pending),
    new Promise((_, rej) => setTimeout(() => rej(new Error('a blocked statement never finished (lock still held?)')), FINISH_MS)),
  ]);

  for (const s of sessions.values()) s.proc.stdin.end();
  process.stdout.write(JSON.stringify(steps.map((st, i) => ({ session: st.session, sql: st.sql, ...results[i] }))));
  setTimeout(() => process.exit(0), 300);
}

main().catch((e) => { process.stderr.write(String(e.stack || e)); process.exit(1); });
