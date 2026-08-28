// Browser verification for the restructured "Company Grants" tab:
// paginated company directory, Add/Edit popups (12-field profile incl.
// format-validated Company ID), and the grants checkbox modal.
// Run from repo root: node scratch/verify-company-tab.mjs
import puppeteer from 'puppeteer';

const BASE = 'https://next.sypher.local';
const OUT = 'scratch';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  // 1. Login + open the Company Grants tab
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')]);
  await page.goto(`${BASE}/admin/access`, { waitUntil: 'networkidle2' });
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[role="tab"]')].find((b) => b.textContent.startsWith('Company Grants'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('Company Grants tab not found');
  await page.waitForFunction(() => document.querySelector('[class*="userRow"]'), { timeout: 15000 });
  console.log('1. Company Grants tab open with rows');

  const rowTexts = () =>
    page.evaluate(() => [...document.querySelectorAll('[class*="userRow"]')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  let rows = await rowTexts();
  console.log('2. rows:', JSON.stringify(rows));
  if (!rows.some((t) => t.includes('Acme Corp') && t.includes('ACMECORP'))) throw new Error('Acme Corp row with ACMECORP id missing');

  // 3. Add Company → client-side format validation first
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add Company');
    btn.click();
  });
  await page.waitForFunction(() => document.querySelector('#company-form-id'), { timeout: 5000 });
  await page.type('#company-form-id', 'ab'); // too short / must start with letter+2 more
  await page.type('#company-form-name', 'Gulf Nuclear Fuel Corp');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create company');
    btn.click();
  });
  await sleep(300);
  const validationShown = await page.evaluate(() => document.querySelector('[class*="modalBody"] [class*="rowError"]')?.textContent ?? null);
  console.log(`3. bad Company ID rejected in-form: "${validationShown}"`);
  if (!validationShown || !/Company ID/.test(validationShown)) throw new Error('company-id format validation did not trigger');

  // 4. Fill the full valid profile and create
  await page.evaluate(() => {
    const input = document.querySelector('#company-form-id');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#company-form-id', 'GNFC01');
  await page.type('#company-form-primary-email', 'hq@gulfnuke.example');
  await page.type('#company-form-admin-email', 'admin@gulfnuke.example');
  await page.type('#company-form-address', 'Plot 42, IDA Bollaram');
  await page.type('#company-form-city', 'Hyderabad');
  await page.type('#company-form-state', 'Telangana');
  await page.type('#company-form-county', 'Sangareddy');
  await page.type('#company-form-country', 'India');
  await page.type('#company-form-seats', '250');
  await page.type('#company-form-cost', '1250000');
  await page.screenshot({ path: `${OUT}/company-add-modal.png` });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create company');
    btn.click();
  });
  await sleep(1200);
  if (await page.$('#company-form-id')) throw new Error('Add company modal stayed open — create failed');
  rows = await rowTexts();
  const gnfcRow = rows.find((t) => t.includes('GNFC01'));
  console.log(`4. created row: ${gnfcRow}`);
  if (!gnfcRow || !gnfcRow.includes('Hyderabad') || !gnfcRow.includes('250 seats') || !gnfcRow.includes('₹12,50,000')) {
    throw new Error('created company row missing expected meta');
  }
  await page.screenshot({ path: `${OUT}/company-list.png` });

  // 5. Edit GNFC01 → seats 250 → 300 persists
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes('GNFC01'));
    row.querySelector('[aria-label="Edit Gulf Nuclear Fuel Corp"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#company-form-seats'), { timeout: 5000 });
  await page.evaluate(() => {
    const input = document.querySelector('#company-form-seats');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#company-form-seats', '300');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Save changes');
    btn.click();
  });
  await sleep(1200);
  rows = await rowTexts();
  console.log(`5. after edit: ${rows.find((t) => t.includes('GNFC01'))}`);
  if (!rows.some((t) => t.includes('GNFC01') && t.includes('300 seats'))) throw new Error('seats edit did not persist to the list');

  // 6. Grants modal: toggle the first course for Acme Corp, then revert
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[class*="userRow"]')].find((r) => r.textContent.includes('Acme Corp'));
    row.querySelector('[aria-label="Manage grants for Acme Corp"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#company-grants-modal-title'), { timeout: 5000 });
  await sleep(600); // grants load
  const firstCheckbox = 'div[class*="modalItemRow"] input[type="checkbox"]';
  const beforeChecked = await page.$eval(firstCheckbox, (el) => el.checked);
  await page.click(firstCheckbox);
  await sleep(800);
  const afterChecked = await page.$eval(firstCheckbox, (el) => el.checked);
  await page.screenshot({ path: `${OUT}/company-grants-modal.png` });
  console.log(`6. first course grant: ${beforeChecked} → ${afterChecked}`);
  if (beforeChecked !== false || afterChecked !== true) throw new Error('grant toggle did not take effect');

  // revert and close
  await page.click(firstCheckbox);
  await sleep(800);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Done');
    btn.click();
  });
  await sleep(400);

  // 7. Search narrows by company id
  await page.type('[aria-label="Search companies"]', 'gnfc');
  await sleep(1300);
  rows = await rowTexts();
  console.log(`7. search "gnfc" → ${rows.length} row(s)`);
  if (rows.length !== 1 || !rows[0].includes('GNFC01')) throw new Error('company search did not narrow to GNFC01');

  console.log('ALL COMPANY CHECKS PASSED');
  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAIL:', e.message);
  process.exit(1);
});
