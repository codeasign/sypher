import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import type { MockExamAttempt, MockExamQuestion } from '@prisma/client';

export interface ScoredAnswer {
  questionId: string;
  selectedAnswer: string[] | null; // null = left unanswered
  isCorrect: boolean;
}

export interface SubmitOutcome {
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: Date;
  scoredAnswers: ScoredAnswer[];
}

/**
 * Canonical answer-array comparison: both sides sorted string arrays,
 * equal length + element-wise equal. correctAnswer is stored canonical
 * (["A"] single, ["A","C"] multi sorted); the submitted selection is
 * normalized the same way, so ["C","A"] still matches ["A","C"].
 */
function answersEqual(correct: unknown, selected: unknown): boolean {
  if (!Array.isArray(correct) || !Array.isArray(selected)) return false;
  const left = correct.map(String).sort();
  const right = selected.map(String).sort();
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

export class MockExamAttemptRepository {
  async create(userId: string, examId: string, questionIds: string[], totalQuestions: number): Promise<MockExamAttempt> {
    return prisma.mockExamAttempt.create({
      data: { userId, examId, questionIds, totalQuestions },
    });
  }

  async findOwnedById(attemptId: string, userId: string): Promise<MockExamAttempt | null> {
    return prisma.mockExamAttempt.findFirst({ where: { id: attemptId, userId } });
  }

  /**
   * Scores purely first (unanswered => incorrect with selectedAnswer null;
   * entries in `submitted` that don't belong to the frozen draw are ignored),
   * then persists in one transaction: a status-guarded updateMany is the
   * race-free double-submit guard — count === 0 means the attempt was
   * already completed (or raced us), and the caller maps that to 409. The
   * controller distinguishes not-owned/not-found beforehand so 404 vs 409
   * stay meaningful.
   */
  async submit(
    attemptId: string,
    userId: string,
    questions: MockExamQuestion[],
    submitted: Map<string, string[]>,
    // The frozen draw size, from the attempt row — the score denominator.
    // `questions` may be shorter if a bank question was deleted after the
    // draw; those count as unanswered/incorrect, keeping `score` consistent
    // with the immutable `totalQuestions` stored at create time.
    frozenTotal: number,
  ): Promise<SubmitOutcome | null> {
    const submittedAt = new Date();
    let correctCount = 0;
    const scoredAnswers: ScoredAnswer[] = questions.map((question) => {
      const selected = submitted.get(question.id);
      const hasSelection = Array.isArray(selected) && selected.length > 0;
      const isCorrect = hasSelection && answersEqual(question.correctAnswer, selected);
      if (isCorrect) correctCount += 1;
      return { questionId: question.id, selectedAnswer: hasSelection ? selected : null, isCorrect };
    });
    const totalQuestions = frozenTotal;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const committed = await prisma.$transaction(async (tx) => {
      // userId in the guard too: even though the controller pre-checks
      // ownership for the 404-vs-409 distinction, the mutation itself must
      // never be able to land on someone else's attempt row.
      const guard = await tx.mockExamAttempt.updateMany({
        where: { id: attemptId, userId, status: 'in_progress' },
        data: { status: 'completed', submittedAt, correctCount, score },
      });
      if (guard.count === 0) return false;
      await tx.mockExamAnswer.createMany({
        data: scoredAnswers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          ...(answer.selectedAnswer === null ? { selectedAnswer: Prisma.JsonNull } : { selectedAnswer: answer.selectedAnswer }),
          isCorrect: answer.isCorrect,
        })),
      });
      return true;
    });

    if (!committed) return null;
    return { score, correctCount, totalQuestions, submittedAt, scoredAnswers };
  }
}
