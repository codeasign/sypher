// Verifies the IDOR fix: a user with no access to a course cannot vote/mark-helpful/read-replies
// on comments attached to that course's modules. Uses two seeded accounts:
//   admin@sypher.local (ADMIN, full access) and employee@acme.example (company user, likely no access).
const BASE = 'http://localhost:4000';

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  if (res.status !== 200 || !cookie) throw new Error(`login failed for ${email}: ${res.status}`);
  return cookie;
}

async function req(path, cookie, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

(async () => {
  const adminCookie = await login('admin@sypher.local', 'devpassword123');

  // Find a published course + its first module, and post a top-level comment as admin.
  const courses = await req('/courses', adminCookie);
  const course = courses.body.find((c) => c.status === 'published');
  if (!course) throw new Error('no published course found');
  const modules = await req(`/courses/${course.slug}/modules`, adminCookie);
  const n = modules.body.length;
  const freePreviewCount = Math.min(Math.ceil(n * 0.2), 10);
  // Pick a module PAST the free-preview window — the free ones are
  // intentionally visible to everyone regardless of role, so testing
  // against one of those would be testing the wrong thing.
  const target = modules.body[freePreviewCount];
  if (!target) throw new Error(`course has only ${n} modules, all in free preview (need > ${freePreviewCount})`);
  const moduleId = target.id;
  console.log('using course:', course.slug, `(${n} modules, ${freePreviewCount} free)`, '| locked module:', moduleId);

  const created = await req(`/modules/${moduleId}/comments`, adminCookie, {
    method: 'POST',
    body: JSON.stringify({ body: 'IDOR verification comment' }),
  });
  console.log('1. admin posts comment:', created.status);
  const commentId = created.body?.id;
  if (!commentId) throw new Error('comment create failed: ' + JSON.stringify(created.body));

  // Lock the course down to PAID_USER only, so a free/no-role account can't see it.
  await req(`/courses/${course.id}/access/roles`, adminCookie, {
    method: 'PUT',
    body: JSON.stringify({ roles: ['PAID_USER'] }),
  });
  console.log('2. course locked to PAID_USER only');

  // employee@acme.example is a company account with no grant on this course.
  const outsiderCookie = await login('employee@acme.example', 'devpassword123');

  const vote = await req(`/comments/${commentId}/vote`, outsiderCookie, {
    method: 'POST',
    body: JSON.stringify({ type: 'UP' }),
  });
  console.log('3. outsider vote:', vote.status, vote.status === 404 ? 'BLOCKED (correct)' : 'LEAK!!');

  const helpful = await req(`/comments/${commentId}/helpful`, outsiderCookie, { method: 'POST' });
  console.log('4. outsider mark-helpful:', helpful.status, helpful.status === 404 ? 'BLOCKED (correct)' : 'LEAK!!');

  const replies = await req(`/comments/${commentId}/replies`, outsiderCookie);
  console.log('5. outsider list-replies:', replies.status, replies.status === 404 ? 'BLOCKED (correct)' : 'LEAK!!');

  // Sanity: admin (full access) can still vote fine.
  const adminVote = await req(`/comments/${commentId}/vote`, adminCookie, {
    method: 'POST',
    body: JSON.stringify({ type: 'UP' }),
  });
  console.log('6. admin vote (sanity, should work):', adminVote.status, JSON.stringify(adminVote.body));

  // Cleanup: restore access roles.
  await req(`/courses/${course.id}/access/roles`, adminCookie, {
    method: 'PUT',
    body: JSON.stringify({ roles: ['FREE_USER', 'PAID_USER'] }),
  });
  console.log('7. course access restored');
})().catch((e) => {
  console.error('VERIFY FAIL:', e.message);
  process.exit(1);
});
