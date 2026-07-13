import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

for (const url of ['http://localhost:3000/profile', 'http://localhost:3000/manage-access']) {
  errors.length = 0;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('=== ' + url + ' ===');
  console.log(errors.length ? errors.join('\n') : 'no console errors');
}

await browser.close();
