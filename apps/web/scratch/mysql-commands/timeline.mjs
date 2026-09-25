#!/usr/bin/env node
/**
 * Multi-session runner for `sql timeline` blocks.
 *
 * Reads JSON from stdin: { steps: [{ session: "A", sql: "..." }, ...] }
 * Opens one live mysql client per session name (each a real, separate connection),
 * runs the steps in the given order, and prints JSON:
 *   [{ session, sql, header, rows, error, blocked }]
 *
 * A step that has not finished after BLOCK_MS is treated as BLOCKED (waiting on a
 * lock): the runner moves on to the next step, and the blocked statement's result
 * is collected when it eventually completes (e.g. after another session commits).
 */
import { spawn } from 'child_process';

const LAB_DIR = process.env.LAB_DIR || 'H:/Abhishek/DB/sypher-db-lab';
const BLOCK_MS = Number(process.env.TIMELINE_BLOCK_MS || 4000);
const FINISH_MS = 20000;

const unescapeBatch = (s) => s.replace(/\\(t|n|\\|0)/g, (_, k) => ({ t: '\t', n: '\n', '\\': '\\', 0: '\0' })[k]);

function openSession(name) {
  const proc = spawn(
    'docker',
    ['compose', 'exec', '-T', 'mysql', 'sh', '-c',
      // Session "R" is the administrator (for diagnostics); every other session is the learner account.
      `mysql -u${name === 'R' ? 'root' : 'sypher'} -ppassword -B -n --force --default-character-set=utf8mb4 sypher-mysql-DvdRental 2>&1`],
    { cwd: LAB_DIR },
  );
  const s = { name, proc, buf: '', seg: [], skipMarker: null, queue: [], done: new Map() };
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    s.buf += chunk;
    let nl;
    while ((nl = s.buf.indexOf('\n')) >= 0) {
      const line = s.buf.slice(0, nl).replace(/\r$/, '');
      s.buf = s.buf.slice(nl + 1);
      handleLine(s, line);
    }
  });
  return s;
}

function handleLine(s, line) {
  if (line.includes('Using a password on the command line')) return;
  const m = /^@@E(\d+)@@$/.exec(line);
  if (m) {
    const n = Number(m[1]);
    if (s.skipMarker === n) { s.skipMarker = null; return; } // the marker's value row
    s.skipMarker = n;
    const resolve = s.done.get(n);
    const seg = s.seg;
    s.seg = [];
    if (resolve) resolve(seg);
    return;
  }
  if (line !== '') s.seg.push(line);
}

function send(s, n, sql) {
  const p = new Promise((resolve) => s.done.set(n, resolve));
  s.proc.stdin.write(`${sql.replace(/;\s*$/, '')};\nSELECT '@@E${n}@@';\n`);
  return p;
}

const parse = (lines) => {
  const err = lines.find((l) => l.startsWith('ERROR '));
  if (err) return { error: err.replace(/ at line \d+/, '') };
  if (!lines.length) return { header: null, rows: [] };
  return { header: lines[0].split('\t').map(unescapeBatch), rows: lines.slice(1).map((l) => l.split('\t').map(unescapeBatch)) };
};

async function main() {
  let input = '';
  for await (const c of process.stdin) input += c;
  const { steps } = JSON.parse(input);
  const sessions = new Map();
  const results = new Array(steps.length);
  const pending = [];

  // Open every session and warm it up BEFORE the timed steps: the first statement on a
  // fresh connection includes docker/client start-up time and must not look like a lock wait.
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
    const outcome = await Promise.race([
      promise.then(() => 'done'),
      new Promise((r) => setTimeout(() => r('blocked'), BLOCK_MS)),
    ]);
    if (outcome === 'blocked') {
      results[i] = { header: null, rows: [], blocked: true };
      pending.push(promise);
    }
  }

  // Let blocked statements finish (their blockers have committed/rolled back by now).
  await Promise.race([
    Promise.all(pending),
    new Promise((_, rej) => setTimeout(() => rej(new Error('a blocked statement never finished (lock still held?)')), FINISH_MS)),
  ]);

  for (const s of sessions.values()) { s.proc.stdin.end(); }
  const out = steps.map((st, i) => ({ session: st.session, sql: st.sql, ...results[i] }));
  process.stdout.write(JSON.stringify(out));
  // closing a client connection rolls back anything left open
  setTimeout(() => process.exit(0), 300);
}

main().catch((e) => { process.stderr.write(String(e.stack || e)); process.exit(1); });
