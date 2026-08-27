// Round 2: exam-mode overlay + results charts. Run:
//   node scratch/mock-ui-e2e2.cjs
const puppeteer = require('puppeteer');

const WEB = 'https://next.sypher.local';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const log = (...a) => console.log(...a);
  const bodyText = () => page.$eval('body', (el) => el.textContent);

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  log('1. logged in');

  await page.goto(`${WEB}/mock-tests/aws-ai-practicioner`, { waitUntil: 'networkidle2' });
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Start test')).click());
  await page.waitForSelector('[class*="timerBox"]', { timeout: 20000 });
  const overlay = await page.$('[class*="examOverlay"]');
  log('2. exam mode:', overlay ? 'overlay mounted on body' : 'NO OVERLAY');
  const exitBtn = await page.$$eval('button', (els) => els.some((e) => e.textContent.includes('Exit test')));
  log('   exit control:', exitBtn ? 'present' : 'MISSING');

  // Exit flow -> back to idle
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Exit test')).click());
  await new Promise((r) => setTimeout(r, 300));
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Yes, exit'))?.click());
  await new Promise((r) => setTimeout(r, 400));
  const idleAgain = (await bodyText()).includes('How this works');
  log('3. exit flow:', idleAgain ? 'back to idle ok' : 'FAILED');
  if (!idleAgain) throw new Error('exit flow broke');

  // Start again so an in_progress attempt exists like a real session
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Start test')).click());
  await page.waitForSelector('[class*="timerBox"]', { timeout: 20000 });

  // Seed a rich fake result (mixed difficulties/domains/outcomes), then reload
  await page.evaluate(() => {
    const mk = (id, domain, difficulty, isCorrect, answered) => ({
      id,
      domain,
      difficulty,
      question: `Sample ${id}?`,
      options: { A: 'one', B: 'two', C: 'three', D: 'four' },
      selectedAnswer: answered ? [isCorrect ? 'A' : 'B'] : null,
      correctAnswer: ['A'],
      explanation: 'Explained.',
      isCorrect,
    });
    const questions = [];
    for (let i = 0; i < 22; i++) questions.push(mk(`e${i}`, i % 2 ? 'Fundamentals of AI and ML' : 'Fundamentals of Generative AI', 'easy', i % 4 !== 0, i % 8 !== 7));
    for (let i = 0; i < 22; i++) questions.push(mk(`m${i}`, i % 2 ? 'Applications of Foundation Models' : 'Guidelines for Responsible AI', 'medium', i % 3 !== 0, i % 9 !== 8));
    for (let i = 0; i < 21; i++) questions.push(mk(`h${i}`, 'Security, Compliance, and Governance for AI Solutions', 'hard', i % 5 === 0, i % 7 !== 6));
    window.sessionStorage.setItem('mock-test-result:aws-ai-practicioner', JSON.stringify({
      attemptId: 'ui-e2e-rich-attempt',
      examTitle: 'AWS Certified AI Practitioner',
      durationMinutes: 90,
      startedAt: new Date(Date.now() - 38 * 60000).toISOString(),
      score: 46,
      correctCount: 30,
      totalQuestions: 65,
      submittedAt: new Date().toISOString(),
      questions,
    }));
  });
  page.once('dialog', (d) => d.accept());
  await page.reload({ waitUntil: 'networkidle2' });

  await page.waitForSelector('[class*="chartCard"]', { timeout: 10000 });
  const chartCards = await page.$$eval('[class*="chartCard"]', (els) => els.length);
  const resultsText = await bodyText();
  const hasComposition = resultsText.includes('Score composition');
  const hasDifficulty = resultsText.includes('Performance by difficulty');
  const hasDomain = resultsText.includes('Performance by domain');
  const hasTimeTaken = resultsText.includes('Time taken') && resultsText.includes('38 min');
  log('4. charts:', `${chartCards} cards | composition:${hasComposition} difficulty:${hasDifficulty} domain:${hasDomain} time-taken(38min):${hasTimeTaken}`);
  const segments = await page.$$eval('[class*="segment"]', (els) => els.length);
  const fills = await page.$$eval('[class*="fillBar"]', (els) => els.length);
  log(`   stacked segments: ${segments} | domain bars: ${fills}`);

  await page.screenshot({ path: 'scratch/mock-results.png', fullPage: true });
  log('5. screenshot saved: scratch/mock-results.png');

  await browser.close();
})().catch((e) => {
  console.error('UI E2E-2 FAIL:', e.message);
  process.exit(1);
});
