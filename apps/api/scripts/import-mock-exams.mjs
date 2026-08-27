// Imports mock exams from apps/web/question-bank/<exam-slug>/<tier>.json
// into Postgres. This is the authoring path for mock exams in v1 — there is
// no admin CRUD endpoint/UI yet.
//
// Idempotent by design: the exam row is upserted by its folder-name slug,
// each question by (examId, sourceId) using the stable id from the bank
// JSON ("AWS-AIF-EASY-0001"), so re-running after a bank fix updates in
// place instead of duplicating. Questions removed from a bank are left in
// the DB (they may be referenced by past attempts) and reported as stale.
//
// Usage (from apps/api): node scripts/import-mock-exams.mjs [--draft]
//   --draft  create newly discovered exams unpublished (default publishes,
//            because an imported bank is complete by definition)
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BANK_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'question-bank');
const TIER_ORDER = ['easy', 'medium', 'hard'];

function warn(message) {
  console.warn(`  WARN ${message}`);
}

// Canonical answer storage: array of option-key strings, multi-selects
// sorted, so the deep-equal scoring contract holds verbatim.
function canonicalCorrectAnswer(raw) {
  if (!Array.isArray(raw)) return null;
  const values = raw.map((entry) => String(entry));
  return values.sort();
}

async function importExam(dirName) {
  const dirPath = join(BANK_ROOT, dirName);
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    warn(`${dirName}: no .json files, skipping`);
    return;
  }
  files.sort();

  let meta = null;
  const tierBanks = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(dirPath, file), 'utf8'));
    if (!meta) meta = parsed;
    // Every tier file must describe the SAME exam — a mismatch means the
    // bank was hand-edited inconsistently; refuse rather than guess.
    for (const key of ['exam_name', 'exam_code', 'duration_minutes', 'live_exam_question_count']) {
      if (parsed[key] !== meta[key]) {
        throw new Error(`${dirName}/${file}: "${key}" is "${parsed[key]}" but "${meta[key]}" in the first file`);
      }
    }
    if (!Array.isArray(parsed.questions)) {
      throw new Error(`${dirName}/${file}: missing "questions" array`);
    }
    tierBanks.push({ file, tier: String(parsed.difficulty_tier || '').toLowerCase(), questions: parsed.questions });
  }

  const countsByTier = Object.fromEntries(TIER_ORDER.map((tier) => [tier, 0]));
  for (const bank of tierBanks) {
    if (!TIER_ORDER.includes(bank.tier)) {
      throw new Error(`${dirName}/${bank.file}: unknown difficulty_tier "${bank.tier}"`);
    }
    countsByTier[bank.tier] += bank.questions.length;
  }

  const draft = process.argv.includes('--draft');
  const exam = await prisma.mockExam.upsert({
    where: { slug: dirName },
    create: {
      slug: dirName,
      title: meta.exam_name,
      examCode: meta.exam_code,
      description: null,
      durationMinutes: Number(meta.duration_minutes),
      liveQuestionCount: Number(meta.live_exam_question_count),
      easyCount: countsByTier.easy,
      mediumCount: countsByTier.medium,
      hardCount: countsByTier.hard,
      isPublished: !draft,
    },
    update: {
      title: meta.exam_name,
      examCode: meta.exam_code,
      durationMinutes: Number(meta.duration_minutes),
      liveQuestionCount: Number(meta.live_exam_question_count),
      easyCount: countsByTier.easy,
      mediumCount: countsByTier.medium,
      hardCount: countsByTier.hard,
      // isPublished deliberately untouched on update — publishing is an
      // explicit decision, not an import side effect.
    },
  });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const bank of tierBanks) {
    for (const raw of bank.questions) {
      const sourceId = typeof raw.id === 'string' ? raw.id : null;
      const promptText = typeof raw.question === 'string' ? raw.question.trim() : '';
      const options = raw.options != null && typeof raw.options === 'object' && !Array.isArray(raw.options) ? raw.options : null;
      const correctAnswer = canonicalCorrectAnswer(raw.correct_answer);
      if (!sourceId || !promptText || !options || Object.keys(options).length < 2 || !correctAnswer) {
        warn(`${dirName}/${bank.file}: skipping malformed question ${sourceId ?? '(no id)'}`);
        skipped += 1;
        continue;
      }
      const fields = {
        domain: String(raw.domain ?? ''),
        difficulty: bank.tier,
        type: String(raw.type ?? 'mcq').toLowerCase(),
        question: promptText,
        options,
        correctAnswer,
        explanation: String(raw.explanation ?? ''),
      };
      const existing = await prisma.mockExamQuestion.findUnique({
        where: { examId_sourceId: { examId: exam.id, sourceId } },
        select: { id: true },
      });
      if (existing) {
        await prisma.mockExamQuestion.update({ where: { id: existing.id }, data: fields });
        updated += 1;
      } else {
        await prisma.mockExamQuestion.create({ data: { examId: exam.id, sourceId, ...fields } });
        imported += 1;
      }
    }
  }

  const totalInDb = await prisma.mockExamQuestion.count({ where: { examId: exam.id } });
  console.log(
    `${dirName}: exam "${meta.exam_name}" (${meta.exam_code}) — ` +
      `${imported} created, ${updated} updated, ${skipped} skipped; ` +
      `bank ${countsByTier.easy}e/${countsByTier.medium}m/${countsByTier.hard}h, ${totalInDb} in DB` +
      (totalInDb !== countsByTier.easy + countsByTier.medium + countsByTier.hard ? ' (stale rows present)' : ''),
  );
}

async function main() {
  const entries = readdirSync(BANK_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (entries.length === 0) {
    console.log(`No exam folders found under ${BANK_ROOT}`);
    return;
  }
  console.log(`Importing ${entries.length} exam(s) from ${BANK_ROOT}${process.argv.includes('--draft') ? ' [--draft]' : ''}`);
  for (const entry of entries) {
    try {
      await importExam(entry.name);
    } catch (error) {
      console.error(`FAIL ${entry.name}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
