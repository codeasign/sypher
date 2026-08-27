// Live E2E for the mock-exam simulator against the local API (:4000).
// Plain HTTP + manually constructed Cookie header — no TLS involved (the
// cookie's domain/secure attributes are browser-enforced; constructing the
// header directly needs neither). Run: node scratch/mock-e2e.mjs
const BASE = 'http://localhost:4000';

const req = async (path, opts = {}, cookie) => {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {}
  return { status: res.status, body, setCookie: res.headers.get('set-cookie') };
};

(async () => {
  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@sypher.local', password: 'devpassword123' }),
  });
  const cookie = (login.setCookie || '').split(';')[0];
  if (login.status !== 200 || !cookie) throw new Error(`login failed ${login.status}`);
  console.log('0. login:', login.status);

  const list = await req('/mock-exams', {}, cookie);
  const exam = list.body[0];
  console.log('1. list:', list.status, exam.slug, `${exam.liveQuestionCount} live`);

  const start = await req(`/mock-exams/${exam.id}/attempts`, { method: 'POST' }, cookie);
  const q = start.body.questions || [];
  const leaked = q.some((x) => 'correctAnswer' in x || 'explanation' in x);
  console.log('2. start:', start.status, '| questions:', q.length, '| answer-leak:', leaked ? 'LEAK!!' : 'none');
  console.log('   question keys:', Object.keys(q[0]).join(','));
  const byDiff = {};
  for (const x of q) byDiff[x.difficulty] = (byDiff[x.difficulty] || 0) + 1;
  console.log('   draw split:', JSON.stringify(byDiff), '| first non-easy block starts at:', q.findIndex((x) => x.difficulty !== 'easy'));

  const answers = q.slice(0, 60).map((x, i) => ({ questionId: x.id, selectedAnswer: [i % 2 === 0 ? 'A' : 'B'] }));
  const sub = await req(`/attempts/${start.body.attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }, cookie);
  console.log('3. submit:', sub.status, '| score:', sub.body.score, '| correct:', `${sub.body.correctCount}/${sub.body.totalQuestions}`);
  console.log('   review has explanation:', typeof sub.body.questions[0].explanation === 'string', '| unanswered in review:', sub.body.questions.filter((x) => !x.selectedAnswer).length);

  const replay = await req(`/attempts/${start.body.attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }, cookie);
  console.log('4. replay submit:', replay.status, replay.body && replay.body.message);

  const foreign = await req('/attempts/cleartlyfakeid1234567890/submit', { method: 'POST', body: JSON.stringify({ answers: [] }) }, cookie);
  console.log('5. fake attempt id:', foreign.status);
})().catch((e) => {
  console.error('E2E FAIL:', e.message);
  process.exit(1);
});
