import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envSrc = readFileSync('D:/jenny/sypher/apps/app/.env.local', 'utf8');
const env = (key) => envSrc.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();

const admin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const anon = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
const PROXY_BASE = 'http://localhost:3001';

function extractPreamble(source) {
  const lines = source.split('\n');
  let i = 0;
  if (/^package\s+\w+\s*$/.test(lines[0] ?? '')) {
    const preambleLines = [lines[0]];
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (/^import\s*\(/.test(lines[i] ?? '')) {
      while (i < lines.length) {
        preambleLines.push(lines[i]);
        const isEnd = lines[i].trim() === ')';
        i++;
        if (isEnd) break;
      }
    } else if (/^import\s+"/.test(lines[i] ?? '')) {
      preambleLines.push(lines[i]);
      i++;
    }
    return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
  }
  const isDirective = (line) => /^\s*(import\s|using\s|#include\b)/.test(line);
  const preambleLines = [];
  while (i < lines.length && (isDirective(lines[i]) || lines[i].trim() === '')) {
    if (isDirective(lines[i])) preambleLines.push(lines[i]);
    i++;
  }
  return { preamble: preambleLines.join('\n'), body: lines.slice(i).join('\n') };
}
function extractLeadingDataStruct(harnessBody, studentBody) {
  const lines = harnessBody.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  const typedefMatch = /^typedef\s+struct\s*\{?\s*$/.test(lines[i] ?? '') || /^typedef\s+struct\s*\{/.test(lines[i] ?? '');
  const namedMatch = /^struct\s+(\w+)\s*\{/.test(lines[i] ?? '');
  if (!typedefMatch && !namedMatch) return null;

  const startLine = i;
  let depth = 0;
  let sawOpenBrace = false;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; sawOpenBrace = true; }
      else if (ch === '}') depth--;
    }
    if (sawOpenBrace && depth === 0) break;
  }
  if (!sawOpenBrace || depth !== 0) return null;

  let endLine = i;
  if (typedefMatch && !/\}\s*\w+\s*;\s*$/.test(lines[endLine])) {
    if (endLine + 1 < lines.length && /^\s*\w+\s*;\s*$/.test(lines[endLine + 1])) endLine++;
  }
  const fullStructText = lines.slice(startLine, endLine + 1).join('\n');

  if (/\b(public|private|protected)\s*:/.test(fullStructText)) return null;

  const nameMatch = fullStructText.match(/^struct\s+(\w+)/) ?? fullStructText.match(/\}\s*(\w+)\s*;\s*$/);
  const typeName = nameMatch?.[1];
  if (typeName && new RegExp(`\\b(class|struct)\\s+${typeName}\\s*\\{`).test(studentBody)) {
    return null;
  }

  const rest = lines.slice(endLine + 1).join('\n');
  return { preamble: fullStructText, body: rest };
}

function composeSourceCode(harness, code, language) {
  const h = extractPreamble(harness);
  const c = extractPreamble(code);
  const hoisted = extractLeadingDataStruct(h.body, c.body);
  const dataStructPreamble = hoisted?.preamble ?? '';
  const harnessBody = hoisted?.body ?? h.body;
  const composed = [h.preamble, c.preamble, dataStructPreamble, c.body, harnessBody].filter((p) => p.trim() !== '').join('\n\n');
  if (language === 'python') {
    return `from __future__ import annotations\n${composed}`;
  }
  return composed;
}

async function withTestUser(fn) {
  const email = `judge0-soak-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const password = `Test-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw createErr;
  try {
    const { data: signedIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    return await fn(signedIn.session.access_token);
  } finally {
    await admin.auth.admin.deleteUser(created.user.id);
  }
}

export async function runProblem({ label, languageId, harness, solution, testCases, cpuTimeLimit, memoryLimit, language }) {
  return withTestUser(async (token) => {
    const sourceCode = composeSourceCode(harness, solution, language);
    const res = await fetch(`${PROXY_BASE}/api/judge0/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'submit', languageId, sourceCode, testCases, cpuTimeLimit, memoryLimit }),
    });
    const body = await res.json().catch(() => ({}));
    const results = body.results ?? [];
    const passed = results.filter((r) => r.statusId === 3).length;
    const ok = res.status === 200 && passed === results.length && results.length === testCases.length;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label} -- HTTP ${res.status}, ${passed}/${results.length} accepted, cached=${body.cached}`);
    if (!ok) {
      console.log('  composed sourceCode:');
      console.log(sourceCode.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('  full results:', JSON.stringify(results, null, 2));
    }
    return { label, ok, passed, total: results.length };
  });
}
