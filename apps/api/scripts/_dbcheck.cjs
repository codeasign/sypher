// Temporary connectivity check for the mock-exam tables.
// Run (from apps/api): node --env-file=.env scripts/_dbcheck.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const exams = await prisma.mockExam.count();
    const questions = await prisma.mockExamQuestion.count();
    const attempts = await prisma.mockExamAttempt.count();
    const answers = await prisma.mockExamAnswer.count();
    console.log(
      `DB OK | MockExam=${exams} MockExamQuestion=${questions} MockExamAttempt=${attempts} MockExamAnswer=${answers}`,
    );
    for (const exam of await prisma.mockExam.findMany({ select: { slug: true, title: true, examCode: true, isPublished: true, easyCount: true, mediumCount: true, hardCount: true, liveQuestionCount: true, durationMinutes: true } })) {
      console.log(`  - ${exam.slug} | ${exam.title} (${exam.examCode}) published=${exam.isPublished} easy=${exam.easyCount} med=${exam.mediumCount} hard=${exam.hardCount} live=${exam.liveQuestionCount} dur=${exam.durationMinutes}`);
    }
  } catch (err) {
    console.error('DB/PRISMA ERR:', String(err.message || err).split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();