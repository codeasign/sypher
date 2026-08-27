const puppeteer = require('puppeteer');
const WEB = 'https://next.sypher.local';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('button[type=submit]')]);

  await page.goto(`${WEB}/mock-tests/aws-ai-practicioner`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  const text = await page.$eval('body', (el) => el.textContent.slice(0, 400));
  console.log('[body]', text);
  const buttons = await page.$$eval('button', (els) => els.map((e) => e.textContent.trim()).slice(0, 12));
  console.log('[buttons]', JSON.stringify(buttons));
  await page.screenshot({ path: 'scratch/debug-idle.png' });
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
