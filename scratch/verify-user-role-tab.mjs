// Browser verification for the v2 "User Role" tab on /admin/access:
// paginated list view, per-row edit action button → role-change popup,
// and the Add User popup. Must go through the Caddy HTTPS host — plain
// :3002 drops the Secure session cookie. Run from repo root:
//   node scratch/verify-user-role-tab.mjs
import puppeteer from 'puppeteer';

const BASE = 'https://next.sypher.local';
const OUT = 'scratch';
const NEW_EMAIL = 'newuser-test@sypher.local';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  // 1. Login as the seeded dev admin and open the tab
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')]);
  console.log('1. login → redirected to:', page.url());

  await page.goto(`${BASE}/admin/access`, { waitUntil: 'networkidle2' });
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[role="tab"]')].find((b) => b.textContent.startsWith('User Role'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('User Role tab not found');
  await page.waitForFunction(() => document.querySelector('[class*="userRow"]'), { timeout: 15000 });
  console.log('2. User Role tab active with list rows rendered');

  // 3. Pagination: total users > 10 → pager must show; Next flips pages
  const pageNum = await page.$$eval('[class*="pagination"] button[class*="pageBtn"]', (els) =>
    els.map((e) => e.textContent.trim()),
  );
  console.log('3. pagination page buttons:', JSON.stringify(pageNum));
  if (pageNum.length < 2) throw new Error(`expected 2+ page buttons (11 users), got ${pageNum.length}`);

  const firstPageEmails = await page.$$eval('[class*="userMeta"]', (els) => els.map((e) => e.textContent.split(' · ')[0]));
  await page.evaluate(() => {
    const next = [...document.querySelectorAll('[class*="pagination"] button')].find((b) => b.textContent.includes('Next'));
    next.click();
  });
  await sleep(1000);
  const secondPageEmails = await page.$$eval('[class*="userMeta"]', (els) => els.map((e) => e.textContent.split(' · ')[0]));
  console.log(`4. page1[0]=${firstPageEmails[0]}, page2 rows=${secondPageEmails.length}, overlap=${secondPageEmails.filter((e) => firstPageEmails.includes(e)).length}`);
  if (secondPageEmails.length === 0 || secondPageEmails.some((e) => firstPageEmails.includes(e))) throw new Error('page flip did not change contents');
  await page.screenshot({ path: `${OUT}/user-role-page2.png` });

  // back to page 1
  await page.evaluate(() => {
    const prev = [...document.querySelectorAll('[class*="pagination"] button')].find((b) => b.textContent.includes('Previous'));
    prev.click();
  });
  await sleep(1000);

  // 5. Edit action button opens the role-change popup; save round-trips
  const roleFor = (emailPart) =>
    page.evaluate((part) => {
      const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes(part));
      return row ? [...row.querySelectorAll('[class*="tag"]')].map((t) => t.textContent.trim()) : null;
    }, emailPart);

  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes('free-test'));
    row.querySelector('[aria-label^="Change role"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#role-change-modal-title'), { timeout: 5000 });
  console.log('5. role-change popup opened');

  await page.select('#new-role-select', 'PAID_USER');
  await page.screenshot({ path: `${OUT}/user-role-modal.png` });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Save changes');
    btn.click();
  });
  await sleep(900);
  if (await page.$('#role-change-modal-title')) throw new Error('modal did not close after successful save');
  let tags = await roleFor('free-test');
  console.log(`6. free-test tags after save: ${JSON.stringify(tags)}`);
  if (!tags?.includes('Paid User')) throw new Error('role did not update to Paid User in list');

  // revert via same popup
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes('free-test'));
    row.querySelector('[aria-label^="Change role"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#new-role-select'), { timeout: 5000 });
  await page.select('#new-role-select', 'FREE_USER');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Save changes');
    btn.click();
  });
  await sleep(900);
  tags = await roleFor('free-test');
  console.log(`7. free-test reverted: ${JSON.stringify(tags)}`);
  if (!tags?.includes('Free User')) throw new Error('revert to Free User failed');

  // 8. Add User popup creates an account that lands on the refreshed list
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add User');
    btn.click();
  });
  await page.waitForFunction(() => document.querySelector('#add-user-modal-title'), { timeout: 5000 });
  await page.type('#new-user-email', NEW_EMAIL);
  await page.type('#new-user-name', 'Test Browser Newuser');
  await page.type('#new-user-password', 'browserpass-2026!');
  await page.select('#new-user-role', 'BRANDER');
  await page.screenshot({ path: `${OUT}/user-add-modal.png` });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create user');
    btn.click();
  });
  await sleep(1200);
  if (await page.$('#add-user-modal-title')) throw new Error('Add User modal stayed open — create failed');
  tags = await roleFor(NEW_EMAIL);
  console.log(`8. created ${NEW_EMAIL} tags: ${JSON.stringify(tags)}`);
  if (!tags || !tags.includes('Brander')) throw new Error('created user missing from list or wrong role');

  // self row has no edit button even when searched
  await page.evaluate(() => {
    const input = document.querySelector('[aria-label="Search users"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(700);
  await page.type('[aria-label="Search users"]', 'admin@sypher');
  await sleep(1300);
  const selfOk = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes('admin@sypher.local'));
    return !!row && !row.querySelector('[aria-label^="Change role"]');
  });
  console.log(`9. self row lacks edit button: ${selfOk}`);
  if (!selfOk) throw new Error('self row should not expose a role-change action');

  await page.screenshot({ path: `${OUT}/user-role-final.png` });
  console.log('ALL CHECKS PASSED');
  await browser.close();
})().catch(async (e) => {
  console.error('VERIFY FAIL:', e.message);
  process.exit(1);
});
