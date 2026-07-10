const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1200 });
  await page.goto('http://localhost:3000/docs/search-algorithms/linear-search', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: 'screenshot-full.png', fullPage: true });
  const html = await page.content();
  require('fs').writeFileSync('rendered.html', html);
  await browser.close();
})();
