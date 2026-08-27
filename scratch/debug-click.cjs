const puppeteer = require('puppeteer');
const WEB = 'https://next.sypher.local';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);

  await page.goto(`${WEB}/mock-tests/aws-ai-practicioner`, { waitUntil: 'networkidle2' });
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Start test')).click());
  await page.waitForSelector('[class*="timerBox"]', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 300));

  const before = await page.evaluate(() => ({
    rows: document.querySelectorAll('[class*="optionRow"]').length,
    radios: document.querySelectorAll('input[type=radio]').length,
  }));
  console.log('before click:', JSON.stringify(before));

  // Click the radio input itself
  await page.click('input[type=radio]');
  await new Promise((r) => setTimeout(r, 500));
  const after = await page.evaluate(() => ({
    checked: document.querySelector('input[type=radio]').checked,
    selectedClass: document.querySelectorAll('[class*="optionSelected"]').length,
    answeredPalette: document.querySelectorAll('[class*="paletteItemAnswered"]').length,
  }));
  console.log('after radio click:', JSON.stringify(after));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
