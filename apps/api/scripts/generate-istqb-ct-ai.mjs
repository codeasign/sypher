/**
 * generate-batch.js — generates easy_extra.json for an exam.
 * Usage: node generate-batch.js <exam-dir> <data-file.json>
 * Reads the existing easy.json, appends questions from data-file, writes easy_extra.json.
 */
const fs = require('fs');
const path = require('path');

const [_, __, examDir, dataFile] = process.argv;
if (!examDir || !dataFile) {
  console.error('Usage: node generate-batch.js <exam-dir> <data-file.json>');
  process.exit(1);
}

const bankRoot = path.resolve(__dirname, '..', '..', 'web', 'question-bank');
const examPath = path.join(bankRoot, examDir);
const easyPath = path.join(examPath, 'easy.json');
const extraPath = path.join(examPath, 'easy_extra.json');

const existing = JSON.parse(fs.readFileSync(easyPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const lastId = existing.questions[existing.questions.length - 1].id;
const lastNum = parseInt(lastId.split('-').pop(), 10);
const questions = data.questions.map((q, i) => ({
  ...q,
  id: lastId.split('-').slice(0, -1).join('-') + '-' + String(lastNum + i + 1).padStart(String(lastNum).length, '0'),
}));

const out = {
  exam_name: existing.exam_name,
  exam_code: existing.exam_code,
  duration_minutes: existing.duration_minutes,
  live_exam_question_count: existing.live_exam_question_count,
  difficulty_tier: 'easy',
  questions_in_this_file: questions.length,
  target_for_tier: null,
  last_updated: new Date().getFullYear().toString(),
  questions,
};

fs.writeFileSync(extraPath, JSON.stringify(out, null, 2));
const total = existing.questions.length + questions.length;
console.log(`${examDir}: wrote ${questions.length} questions (IDs ${questions[0].id}-${questions[questions.length-1].id})`);
console.log(`  Combined: ${total} / 100 (${questions.length} new + ${existing.questions.length} existing)`);
