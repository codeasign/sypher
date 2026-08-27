// Targeted screenshots: exam-mode overlay + results charts region.
const puppeteer = require('puppeteer');
const WEB = 'https://next.sypher.local';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@sypher.local');
  await page.type('#password', 'devpassword123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('button[type=submit]')]);

  // Exam mode shot
  await page.goto(`${WEB}/mock-tests/aws-ai-practicioner`, { waitUntil: 'networkidle2' });
  await page.$$eval('button', (els) => els.find((e) => e.textContent.includes('Start test')).click());
  await page.waitForSelector('[class*="timerBox"]', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/mock-exam-mode.png' });

  // Results charts shot (seeded rich result)
  await page.evaluate(() => {
    const mk = (id, domain, difficulty, isCorrect, answered) => ({
      id, domain, difficulty,
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
      score: 46, correctCount: 30, totalQuestions: 65,
      submittedAt: new Date().toISOString(),
      questions,
    }));
  });
  page.once('dialog', (d) => d.accept());
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('[class*="chartCard"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 300));
  // Clip: from top of page through the domain chart (before the long review list)
  const runnerBox = await page.$eval('[class*="scoreCard"]', (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY };
  });
  await page.screenshot({
    path: 'scratch/mock-charts.png',
    clip: { x: 0, y: Math.max(0, runnerBox.top - 10), width: 1440, height: 1150 },
  });
  console.log('saved scratch/mock-exam-mode.png + scratch/mock-charts.png');
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
