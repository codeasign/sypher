// Live verification for the Effective Communication course + category/
// relatedCourses feature. Two phases:
//   A) employee@acme.example (no course grant): free preview count, locked
//      module notice, complete-all-modules -> /mock-tests listing
//   B) admin: category badge + related courses links on course home
// Run from repo root: node scratch/communication-skills/verify-live.mjs

import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'https://next.sypher.local';
const PASSWORD = 'devpassword123';
const COURSE = 'communication-skills';
const SHOTS = new URL('./verify/', import.meta.url);
fs.mkdirSync(SHOTS, { recursive: true });

const MODULE_SLUGS = [
  'course-overview',
  'what-good-communication-actually-looks-like',
  'clarity-say-what-you-mean',
  'listening-stop-preparing-your-reply',
  'asking-better-questions',
  'speaking-with-confidence',
  'tone-words-and-context',
  'assertive-communication',
  'disagreement-and-difficult-conversations',
  'feedback-giving-it-and-taking-it',
  'communication-at-work',
  'putting-it-all-together',
];

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', email);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  await page.waitForNetworkIdle({ idleTime: 500 }).catch(() => {});
}

const browser = await puppeteer.launch({ headless: 'new' });
try {
  // ---- Phase A: employee without a grant ----
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await login(page, 'employee@acme.example');
  check('employee login', !page.url().includes('/login'), page.url());

  await page.goto(`${BASE}/learn/${COURSE}`, { waitUntil: 'networkidle2' });
  // Module list lives behind the Topics tab; About is the default.
  const clickedTopics = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Topics');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Topics tab clickable', clickedTopics);
  await new Promise((r) => setTimeout(r, 300));
  const home = await page.evaluate(() => ({
    badge: document.querySelector('[class*="categoryBadge"]')?.textContent ?? null,
    moduleLinks: document.querySelectorAll('a[class*="moduleLink"]').length,
    freeBadges: document.querySelectorAll('[class*="freeBadge"]').length,
    lockIcons: document.querySelectorAll('a[class*="moduleLinkLocked"]').length,
    title: document.querySelector('h1')?.textContent ?? '',
  }));
  check('course home shows title', home.title === 'Effective Communication', home.title);
  check('category badge = life-skills', home.badge === 'life-skills', String(home.badge));
  check('12 module rows', home.moduleLinks === 12, String(home.moduleLinks));
  check('3 free badges (ceil 12*0.2)', home.freeBadges === 3, String(home.freeBadges));
  check('9 locked rows', home.lockIcons === 9, String(home.lockIcons));
  await page.screenshot({ path: new URL('A-course-home-employee.png', SHOTS).pathname.replace(/^\/(\w:)/, '$1') });

  // Locked module (4th): notice, no body content
  await page.goto(`${BASE}/learn/${COURSE}/${MODULE_SLUGS[3]}`, { waitUntil: 'networkidle2' });
  const locked = await page.evaluate(() => document.body.innerText);
  check(
    'locked module shows paywall notice',
    locked.includes('part of the paid content') && locked.includes('Go Pro'),
  );
  check('locked module body stripped', !locked.includes('Someone is talking to you'));
  await page.screenshot({ path: new URL('A-locked-module.png', SHOTS).pathname.replace(/^\/(\w:)/, '$1') });

  // Free module renders real content
  await page.goto(`${BASE}/learn/${COURSE}/clarity-say-what-you-mean`, { waitUntil: 'networkidle2' });
  const freeBody = await page.evaluate(() => document.body.innerText);
  check('free module renders content', freeBody.includes('Can you send me the report by Thursday?'));
  check('suggested answer visible', freeBody.includes('Suggested answer'));

  // Completion of ALL modules requires full access: locked-module visits
  // never fire the completion POST (by design), so run this as admin.
  // (Moved to Phase B.)

  // ---- Phase B: admin sees category + related courses ----
  const admin = await browser.newPage();
  await admin.setViewport({ width: 1440, height: 1000 });
  await login(admin, 'admin@sypher.local');
  check('admin login', !admin.url().includes('/login'), admin.url());

  // Complete all modules in order -> CourseCompletion -> /mock-tests
  for (const mod of MODULE_SLUGS) {
    await admin.goto(`${BASE}/learn/${COURSE}/${mod}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));
  }
  await admin.goto(`${BASE}/mock-tests`, { waitUntil: 'networkidle2' });
  const mockText = await admin.evaluate(() => document.body.innerText);
  check('completed course listed on /mock-tests', mockText.includes('Effective Communication'));
  await admin.screenshot({ path: new URL('B-mock-tests.png', SHOTS).pathname.replace(/^\/(\w:)/, '$1') });

  // Editor exposes the new fields: row -> Manage course button -> Details tab
  await admin.goto(`${BASE}/manage-courses`, { waitUntil: 'networkidle2' });
  const clicked = await admin.evaluate(() => {
    const nameSpan = [...document.querySelectorAll('span')].find((n) => n.textContent?.trim() === 'Effective Communication');
    let el = nameSpan;
    let manageBtn = null;
    while (el && !manageBtn) {
      manageBtn = el.querySelector('button[aria-label="Manage course"]');
      el = el.parentElement;
    }
    if (manageBtn) {
      manageBtn.click();
      return true;
    }
    return false;
  });
  check('opened workspace via Manage course button', clicked);
  await admin.waitForNetworkIdle({ idleTime: 500 }).catch(() => {});
  const editorFields = await admin.evaluate(() => ({
    category: Boolean(document.querySelector('#course-category')),
    related: Boolean(document.querySelector('#course-related')),
  }));
  check('editor has Category field', editorFields.category);
  check('editor has Related courses field', editorFields.related);
  await admin.screenshot({ path: new URL('B-editor-fields.png', SHOTS).pathname.replace(/^\/(\w:)/, '$1') });

  await page.goto(`${BASE}/learn/${COURSE}`, { waitUntil: 'networkidle2' });
  const aboutText = await page.evaluate(() => document.body.innerText);
  check('related heading renders (when set)', aboutText.includes('Related courses'), 'set --related before this run to see 2 links');
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
