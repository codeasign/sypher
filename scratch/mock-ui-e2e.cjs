// Browser-level check of the Mock Test UI via Puppeteer against
// https://next.sypher.local (local Caddy). CSS-module classes are hashed,
// so selectors match on the stable suffix ([class*="rulesCard"]). Run:
//   node scratch/mock-ui-e2e.cjs
const puppeteer = require('puppeteer');

const WEB = 'https://next.sypher.local';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const log = (...a) => console.log(...a);
  const bodyText = () => page.$eval('body', (el) => el.textContent);

  // 1. Login
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  log('1. login ok, landed on:', page.url());

  // 2. Exam list
  await page.goto(`${WEB}/mock-tests`, { waitUntil: 'networkidle2' });
  const listText = await bodyText();
  const cardPresent = listText.includes('AWS Certified AI Practitioner');
  log('2. /mock-tests:', cardPresent ? 'exam card present' : 'MISSING card');

  // 3. Runner idle view
  await page.goto(`${WEB}/mock-tests/aws-ai-practicioner`, { waitUntil: 'networkidle2' });
  const idleText = await bodyText();
  log('3. idle view:', idleText.includes('How this works') ? 'rules shown' : 'MISSING rules');
  const startBtn = await page.$$eval('button', (els) => els.some((e) => e.textContent.includes('Start test')));
  log('   Start test button:', startBtn ? 'present' : 'MISSING');

  // 4. Start -> active view
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Start test')).click());
  await page.waitForSelector('[class*="timerBox"]', { timeout: 20000 });
  const timerText = await page.$eval('[class*="timerBox"]', (el) => el.textContent);
  const paletteCount = await page.$$eval('[class*="paletteItem"]', (els) => els.length);
  const optionKeys = await page.$$eval('[class*="optionKey"]', (els) => els.map((e) => e.textContent));
  log(`4. active: timer=${timerText} | palette=${paletteCount} | first options:`, JSON.stringify(optionKeys.slice(0, 2)));

  // 5. Answer one question, then reload mid-test -> must land back on idle
  await page.click('[class*="optionRow"]');
  await new Promise((r) => setTimeout(r, 400)); // let React flush the re-render
  const answeredBefore = await page.$$eval('[class*="paletteItemAnswered"]', (els) => els.length);
  log('   clicked an option, palette marked answered:', answeredBefore);
  page.once('dialog', (d) => d.accept());
  await page.reload({ waitUntil: 'networkidle2' });
  const afterReload = await bodyText();
  log('5. mid-test reload ->', afterReload.includes('How this works') ? 'back on idle (abandon-by-design)' : 'UNEXPECTED state');

  // 6. Results restore: seed sessionStorage under the real slug key, reload
  await page.evaluate(() => {
    window.sessionStorage.setItem('mock-test-result:aws-ai-practicioner', JSON.stringify({
      attemptId: 'ui-e2e-fake-attempt',
      examTitle: 'AWS Certified AI Practitioner',
      durationMinutes: 90,
      score: 73,
      correctCount: 47,
      totalQuestions: 65,
      submittedAt: new Date().toISOString(),
      questions: [{
        id: 'fake-q',
        domain: 'Fundamentals of AI and ML',
        difficulty: 'easy',
        question: 'UI smoke question?',
        options: { A: 'right answer', B: 'wrong pick', C: 'other', D: 'other2' },
        selectedAnswer: ['B'],
        correctAnswer: ['A'],
        explanation: 'Because A is right.',
        isCorrect: false,
      }],
    }));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  const resultsText = await bodyText();
  const restored = resultsText.includes('Your score') && resultsText.includes('Review') && resultsText.includes('73%');
  log('6. results restore:', restored ? 'rendered (score+review)' : 'FAILED');

  // 7. Dashboard intact + section visibility rule
  await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle2' });
  const dashText = await bodyText();
  log('7. dashboard:', dashText.includes('Courses you have access to') ? 'loads' : 'BROKEN',
    '| Completed-courses section:', dashText.includes('Completed courses') ? 'visible' : 'hidden (no completions)');

  await browser.close();
})().catch((e) => {
  console.error('UI E2E FAIL:', e.message);
  process.exit(1);
});
