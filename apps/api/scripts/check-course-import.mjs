const base = process.env.IMPORT_API_URL || 'http://localhost:4000';
// When set, skips /auth/login (and its recaptcha gate, required in
// production by default) entirely — goes straight through apps/api's
// 'importTool' security scheme (tsoaAuth.ts) via a header on every request.
const importToolSecret = process.env.IMPORT_TOOL_SECRET || '';
let cookie = '';
if (importToolSecret) {
  console.log('using IMPORT_TOOL_SECRET, skipping /auth/login entirely');
} else {
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.IMPORT_ADMIN_EMAIL || 'admin@sypher.local', password: process.env.IMPORT_ADMIN_PASSWORD || 'devpassword123' }),
  });
  if (!login.ok) throw new Error(`Login: ${login.status}`);
  cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
function authHeaders() {
  return importToolSecret ? { 'X-Import-Tool-Secret': importToolSecret } : { Cookie: cookie };
}
async function get(p) {
  const r = await fetch(base + p, { headers: authHeaders() });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
}
const catalog = await get('/courses/manage/list?limit=100');
if (process.argv.includes('--probe-import')) {
  const body = JSON.stringify({ slug: 'probe', title: 'Probe', bodyMdx: '', orderIndex: 0, sectionLabel: null, sectionOrder: null });
  for (const authenticated of [false, true]) {
    const r = await fetch(`${base}/courses/00000000-0000-0000-0000-000000000000/modules/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Cookie: cookie } : {}) }, body,
    });
    console.log('Import endpoint probe', { authenticated, status: r.status, body: await r.text() });
  }
}
console.log('Catalog total:', catalog.total);
if (process.argv.includes('--verify-web')) {
  const result = await new Promise((resolve, reject) => {
    // The local Caddy development certificate is not in Node's trust store.
    https.get('https://next.sypher.local/manage-courses', { headers: { Cookie: cookie }, rejectUnauthorized: false }, r => {
      let body = '';
      r.setEncoding('utf8');
      r.on('data', chunk => { body += chunk; });
      r.on('end', () => resolve({ status: r.statusCode, body }));
    }).on('error', reject);
  });
  if (result.status !== 200 || !['agentic-ai-fundamentals', 'git-github-actions'].every(s => result.body.includes(s))) throw new Error('Manage Courses web render did not include both courses');
  console.log('HTTPS Manage Courses render: 200, both courses present');
}
for (const slug of ['agentic-ai-fundamentals', 'git-github-actions']) {
  const c = catalog.courses.find(c => c.slug === slug);
  if (!c) { console.log(slug, 'absent'); continue; }
  const modules = await get(`/courses/${c.id}/manage/modules`);
  if (process.argv.includes('--probe-import') && modules.length) {
    const { slug: moduleSlug, title, bodyMdx, orderIndex, sectionLabel, sectionOrder } = modules[0];
    const payload = { slug: moduleSlug, title, bodyMdx, orderIndex, sectionLabel, sectionOrder };
    for (const invalid of [{ ...payload, slug: '../invalid' }, { ...payload, orderIndex: -1 }]) {
      const r = await fetch(`${base}/courses/${c.id}/modules/import`, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(invalid),
      });
      if (r.status !== 400) throw new Error(`Expected validation rejection, got ${r.status}`);
    }
    const repeat = await fetch(`${base}/courses/${c.id}/modules/import`, {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!repeat.ok || (await repeat.json()).id !== modules[0].id) throw new Error('Import did not retain module identity');
    if ((await get(`/courses/${c.id}/manage/modules`)).length !== modules.length) throw new Error('Import duplicated a module');
    console.log(slug, 'validation and idempotent module import passed');
  }
  const urls = [...new Set(modules.flatMap(m => [...m.bodyMdx.matchAll(/<img src="([^"]+\.svg)"/g)].map(m => m[1])))];
  console.log(JSON.stringify({ slug, id: c.id, status: c.status, modules: modules.length, ordered: modules.every((m, i) => m.orderIndex === i * 10), svgUrls: urls.length }));
  if (process.argv.includes('--verify-svg')) {
    let passed = 0;
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async url => {
        const r = await fetch(url);
        const svg = await r.text();
        if (!r.ok || !['blackboard-v3', '#0B0F14', '#16202C', '#5EA3E6', '#E8EEF5'].every(s => svg.includes(s))) throw new Error(`SVG verification failed: ${url}`);
        passed++;
      }));
    }
    console.log(slug, 'CDN SVGs verified:', passed);
  }
}
import https from 'node:https';
