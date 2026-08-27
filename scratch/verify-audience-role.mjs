// Throwaway verification: /learn audience-role chips + filtering.
import puppeteer from 'puppeteer';

const BASE = 'https://next.sypher.local';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await puppeteer.launch({ headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // login (Caddy HTTPS so the secure session cookie sticks)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@sypher.local');
  await page.type('input[type="password"]', 'devpassword123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // /learn — chips row should list All, Developer, QA / QE
  await page.goto(`${BASE}/learn`, { waitUntil: 'networkidle2' });
  const chips = await page.$$eval('[class*="roleChip"]', (els) =>
    els.filter((e) => !e.className.includes('roleFilters')).map((e) => e.textContent.trim()),
  );
  check('chips render', chips.length >= 3, JSON.stringify(chips));
  check('has Developer chip', chips.includes('Developer'));
  check('has QA chip', chips.some((c) => c.startsWith('QA')));

  // card count on All vs filtered
  const allCards = await page.$$eval('[class*="cardTitle"]', (els) => els.map((e) => e.textContent.trim()));
  check('All shows full catalog', allCards.length >= 16, `${allCards.length} cards`);

  await page.goto(`${BASE}/learn?role=developer`, { waitUntil: 'networkidle2' });
  const devCards = await page.$$eval('[class*="cardTitle"]', (els) => els.map((e) => e.textContent.trim()));
  check('developer filter narrows', devCards.length === 1 && /playwright/i.test(devCards[0]), JSON.stringify(devCards));

  await page.screenshot({ path: 'scratch/role-filter-developer.png' });

  await page.goto(`${BASE}/learn?role=qa`, { waitUntil: 'networkidle2' });
  const qaCards = await page.$$eval('[class*="cardTitle"]', (els) => els.map((e) => e.textContent.trim()));
  check('qa filter narrows', qaCards.length === 1 && /python-for-test-automation|Python for Test/i.test(qaCards[0] ?? ''), JSON.stringify(qaCards));
  await page.screenshot({ path: 'scratch/role-filter-qa.png' });

  // role tag visible on cards
  const tagOnCard = await page.$eval('[class*="cardTags"]', (el) => el.textContent.trim()).catch(() => null);
  check('role tag renders on card', Boolean(tagOnCard && tagOnCard.startsWith('QA')), String(tagOnCard));

  // empty-state for a role with no courses
  await page.goto(`${BASE}/learn?role=engineering-manager`, { waitUntil: 'networkidle2' });
  const emptyText = await page.$eval('[class*="emptyText"]', (el) => el.textContent.trim()).catch(() => null);
  check('unknown-role empty state', Boolean(emptyText && emptyText.includes('Engineering Manager')), String(emptyText));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
