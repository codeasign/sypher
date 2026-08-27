const puppeteer = require('puppeteer');
const WEB = 'https://next.sypher.local';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('button[type=submit]')]);

  await page.goto(`${WEB}/blog/welcome-to-sypher-next`, { waitUntil: 'networkidle2' });

  // Post a comment as admin (self-owned) so we can see the owner action row.
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.type('textarea', 'Layout verification comment.');
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Post Comment'))?.click());
  await new Promise((r) => setTimeout(r, 800));

  // Width check: article vs discussion left/right edges.
  const layout = await page.evaluate(() => {
    const article = document.querySelector('article');
    const discussion = document.querySelector('[class*="discussion"]');
    const adSlot = document.querySelector('[class*="adSlot"]');
    const mainColumn = article ? article.closest('[class*="mainColumn"]') : null;
    const r = (el) => el ? (({ left, right, top, bottom, height }) => ({ left: Math.round(left), right: Math.round(right), top: Math.round(top), bottom: Math.round(bottom), height: Math.round(height) }))(el.getBoundingClientRect()) : null;
    return {
      article: r(article),
      discussion: r(discussion),
      adSlot: r(adSlot),
      mainColumn: r(mainColumn),
    };
  });
  console.log('article:', JSON.stringify(layout.article));
  console.log('discussion:', JSON.stringify(layout.discussion));
  console.log('mainColumn:', JSON.stringify(layout.mainColumn));
  console.log('adSlot:', JSON.stringify(layout.adSlot));
  console.log('width match (article vs discussion left/right):', layout.article.left === layout.discussion.left && layout.article.right === layout.discussion.right);
  console.log('adSlot bottom reaches near mainColumn bottom (height match):', Math.abs(layout.adSlot.bottom - layout.mainColumn.bottom) < 400 ? 'reasonable' : `gap=${layout.mainColumn.bottom - layout.adSlot.bottom}`);

  // Owner action row check: Edit/Delete icons, right-aligned.
  const ownerRow = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[class*="actionBtnEdit"], [class*="actionBtnDanger"]')];
    return btns.map((b) => ({ label: b.getAttribute('aria-label'), rect: (({left,right}) => ({left: Math.round(left), right: Math.round(right)}))(b.getBoundingClientRect()) }));
  });
  console.log('owner action buttons:', JSON.stringify(ownerRow));

  await page.screenshot({ path: 'scratch/blog-discussion-layout.png', fullPage: false });
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
