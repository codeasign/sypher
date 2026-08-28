import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const BASE = 'https://next.sypher.local';
const OUT = 'scratch';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1x1 red PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
writeFileSync(`${OUT}/test-logo.png`, PNG);

const browser = await puppeteer.launch({ headless: 'new', ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 }); // the size that clipped before
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.type('#email', 'admin@sypher.local');
await page.type('#password', 'devpassword123');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/access`, { waitUntil: 'networkidle2' });
await page.evaluate(() => {
  [...document.querySelectorAll('button[role="tab"]')].find((b) => b.textContent.startsWith('Company Grants')).click();
});
await page.waitForFunction(() => document.querySelector('[class*="userRow"]'));
await sleep(500);
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add Company').click();
});
await page.waitForFunction(() => document.querySelector('#company-form-id'));

// 1. Submit empty → first mandatory error
await page.evaluate(() => {
  [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create company').click();
});
await sleep(300);
const emptyErr = await page.evaluate(() => document.querySelector('[class*="formError"]')?.textContent ?? null);
console.log('1. empty submit →', JSON.stringify(emptyErr));

// 2. Fill everything except logo → logo required error
await page.type('#company-form-id', 'ZENQ01');
await page.type('#company-form-name', 'Zenq Industries');
await page.type('#company-form-primary-email', 'contact@zenq.example');
await page.type('#company-form-secondary-email', 'ops@zenq.example');
await page.type('#company-form-admin-email', 'admin@zenq.example');
await page.type('#company-form-address', 'Hitech City Rd');
await page.type('#company-form-city', 'Hyderabad');
await page.type('#company-form-state', 'Telangana');
await page.type('#company-form-county', 'Rangareddy');
await page.type('#company-form-country', 'India');
await page.type('#company-form-seats', '120');
await page.type('#company-form-cost', '600000');
await page.evaluate(() => {
  const el = document.querySelector('#company-form-access');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '2027-08-27');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.evaluate(() => {
  [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create company').click();
});
await sleep(300);
const logoErr = await page.evaluate(() => document.querySelector('[class*="formError"]')?.textContent ?? null);
console.log('2. all-but-logo submit →', JSON.stringify(logoErr));

// 3. Upload the logo through the hidden file input → then create
const fileInput = await page.$('#company-form-logo');
await fileInput.uploadFile(`${OUT}/test-logo.png`);
await page.waitForFunction(() => document.querySelector('[class*="logoDone"]'), { timeout: 30000 });
console.log('3. logo uploaded to Bunny ✓');
await page.screenshot({ path: `${OUT}/modal-filled-top.png` });
// scroll the modal body to the bottom to prove nothing is clipped
await page.evaluate(() => {
  const body = document.querySelector('[class*="modalBody"]');
  body.scrollTop = body.scrollHeight;
});
await sleep(300);
await page.screenshot({ path: `${OUT}/modal-filled-bottom.png` });
await page.evaluate(() => {
  [...document.querySelectorAll('[class*="modalFooter"] button')].find((b) => b.textContent.trim() === 'Create company').click();
});
await sleep(1500);
if (await page.$('#company-form-id')) throw new Error('modal stayed open — create failed');
const rows = await page.evaluate(() => [...document.querySelectorAll('[class*="userRow"]')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
const zen = rows.find((t) => t.includes('ZENQ01'));
console.log('4. created row:', zen);
if (!zen || !zen.includes('Access till') || !zen.includes('120 seats')) throw new Error('row missing access-till/seats meta');
await page.screenshot({ path: `${OUT}/company-list-v3.png` });
await browser.close();
console.log('ALL V3 CHECKS PASSED');
