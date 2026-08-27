import { Body, Controller, Path, Post, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Prisma, User } from '@prisma/client';
import { MockExamAttemptRepository } from '../repositories/MockExamAttemptRepository';
import { MockExamRepository } from '../repositories/MockExamRepository';

const mockExamRepository = new MockExamRepository();
const mockExamAttemptRepository = new MockExamAttemptRepository();

interface MockAttemptAnswerInput {
  questionId: string;
  // The chosen option keys, e.g. ["B"] (single-answer today; ["A","C"]
  // headroom for multi-select). Unanswered questions are simply omitted
  // from the array and score incorrect with selectedAnswer persisted null.
  selectedAnswer: string[];
}

interface MockAttemptSubmitRequest {
  answers: MockAttemptAnswerInput[];
}

// Full per-question review after submit — now correctAnswer/explanation are
// included (this is the only response shape that ever carries them).
interface MockAttemptResultQuestion {
  id: string;
  domain: string;
  difficulty: string;
  question: string;
  options: Record<string, string>;
  selectedAnswer: string[] | null;
  correctAnswer: string[];
  explanation: string;
  isCorrect: boolean;
}

interface MockAttemptResultResponse {
  attemptId: string;
  examTitle: string;
  durationMinutes: number;
  // Lets the client show "completed in X min" on the results screen.
  startedAt: Date;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: Date;
  questions: MockAttemptResultQuestion[];
}

interface MockAttemptMessageResponse {
  message: string;
}

// questionIds is a Json column holding the frozen ordered draw — treat any
// malformed stored value as an empty draw rather than throwing.
function parseQuestionIds(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

@Route('attempts')
@Tags('MockExams')
export class MockExamAttemptController extends Controller {
  // Submits and scores an attempt. Existence/ownership resolve to 404
  // BEFORE anything else so 404 vs 409 stay distinguishable; double-submit
  // (replayed request or raced tab) loses inside the repository's status-
  // guarded transaction and surfaces here as 409.
  @Post('{attemptId}/submit')
  @Security('session')
  public async submit(
    @Path() attemptId: string,
    @Body() body: MockAttemptSubmitRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() conflict: TsoaResponse<409, MockAttemptMessageResponse>,
  ): Promise<MockAttemptResultResponse | void> {
    const user = request.user as User;
    const attempt = await mockExamAttemptRepository.findOwnedById(attemptId, user.id);
    if (!attempt) return notFound(404);
    if (attempt.status !== 'in_progress') {
      return conflict(409, { message: 'This attempt has already been submitted.' });
    }

    const frozenIds = parseQuestionIds(attempt.questionIds);
    const questions = await mockExamRepository.listQuestionsByIds(frozenIds);
    const byId = new Map(questions.map((q) => [q.id, q]));
    const drawnQuestions = frozenIds.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });

    const submitted = new Map<string, string[]>();
    for (const answer of body.answers ?? []) {
      submitted.set(answer.questionId, Array.isArray(answer.selectedAnswer) ? answer.selectedAnswer : []);
    }

    const outcome = await mockExamAttemptRepository.submit(attempt.id, user.id, drawnQuestions, submitted);
    if (!outcome) return conflict(409, { message: 'This attempt has already been submitted.' });

    // The attempt's exam must exist (Cascade would have removed the attempt
    // with it) — guard anyway rather than assume.
    const exam = await mockExamRepository.findAnyStateById(attempt.examId);

    return {
      attemptId: attempt.id,
      examTitle: exam?.title ?? 'Mock test',
      durationMinutes: exam?.durationMinutes ?? 0,
      startedAt: attempt.startedAt,
      score: outcome.score,
      correctCount: outcome.correctCount,
      totalQuestions: outcome.totalQuestions,
      submittedAt: outcome.submittedAt,
      questions: drawnQuestions.map((question, index) => ({
        id: question.id,
        domain: question.domain,
        difficulty: question.difficulty,
        question: question.question,
        options: question.options as Record<string, string>,
        selectedAnswer: outcome.scoredAnswers[index]?.selectedAnswer ?? null,
        correctAnswer: (question.correctAnswer as string[]) ?? [],
        explanation: question.explanation,
        isCorrect: outcome.scoredAnswers[index]?.isCorrect ?? false,
      })),
    };
  }
}
