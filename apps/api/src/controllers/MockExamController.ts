import { Controller, Get, Path, Post, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { MockExam, User } from '@prisma/client';
import { MockExamRepository, type DrawSplit } from '../repositories/MockExamRepository';
import { MockExamAttemptRepository } from '../repositories/MockExamAttemptRepository';
import { CourseRepository } from '../repositories/CourseRepository';
import { AuthoredCourseAccessRepository } from '../repositories/AuthoredCourseAccessRepository';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { hasCourseAccess } from '../lib/accessControl';

const mockExamRepository = new MockExamRepository();
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const mockExamAttemptRepository = new MockExamAttemptRepository();
const courseRepository = new CourseRepository();
const authoredCourseAccessRepository = new AuthoredCourseAccessRepository();
const companyDirectoryRepository = new CompanyDirectoryRepository();

// One exam on the /mock-tests list page — explicit field projection, the
// list page never needs anything beyond what it renders.
interface MockExamSummaryEntry {
  id: string;
  slug: string;
  title: string;
  examCode: string;
  description: string | null;
  durationMinutes: number;
  liveQuestionCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  role: string | null;
  officialLink: string | null;
  logoUrl: string | null;
  priceUsd: number | null;
}

// Options ship as the full key -> text map ("A" -> "ML is a subset of AI…")
// — the runner renders every option as key + text; keys alone are only
// used for scoring. correctAnswer/explanation are deliberately absent from
// this shape and stripped server-side: they must never reach the client
// before submit.
interface MockExamQuestionView {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  question: string;
  options: Record<string, string>;
}

interface MockExamStartResponse {
  attemptId: string;
  startedAt: Date;
  durationMinutes: number;
  questions: MockExamQuestionView[];
}

// Error payload following the AuthMessageResponse precedent.
interface MockExamMessageResponse {
  message: string;
}

/**
 * Full-course-access check for courseId-linked exams — mirrors
 * CourseController.completeModule's rule (a mutation with no legitimate
 * reason to fire behind a paywall), built from the same building blocks as
 * its courseAccessInfo() rather than importing that file-private helper.
 */
async function hasFullCourseAccess(user: User, courseId: string): Promise<boolean> {
  const course = await courseRepository.findById(courseId);
  if (!course || course.status !== 'published') return false;
  const allowedRoles = await authoredCourseAccessRepository.getAllowedRoles(course.id);
  let companyAllowedIds: Set<string> | undefined;
  if (user.companyId) {
    // Company access flows through the employee's groups now — see
    // CompanyDirectoryRepository / the corporate portal.
    companyAllowedIds = new Set(await companyDirectoryRepository.listCourseIdsForUserGroups(user.companyId, user.id));
  }
  return hasCourseAccess(user.role, allowedRoles, { companyAllowedSlugs: companyAllowedIds, slug: course.id });
}

function toView(question: {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  question: string;
  options: unknown;
}): MockExamQuestionView {
  return {
    id: question.id,
    domain: question.domain,
    difficulty: question.difficulty,
    type: question.type,
    question: question.question,
    options: question.options as Record<string, string>,
  };
}

function toSummaryEntry(exam: MockExam): MockExamSummaryEntry {
  return {
    id: exam.id,
    slug: exam.slug,
    title: exam.title,
    examCode: exam.examCode,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    liveQuestionCount: exam.liveQuestionCount,
    easyCount: exam.easyCount,
    mediumCount: exam.mediumCount,
    hardCount: exam.hardCount,
    role: exam.role,
    officialLink: exam.officialLink,
    logoUrl: exam.logoUrl,
    priceUsd: exam.priceUsd,
  };
}

export interface MockExamSummaryPage {
  exams: MockExamSummaryEntry[];
  total: number;
}

@Route('mock-exams')
@Tags('MockExams')
export class MockExamController extends Controller {
  // Published exams only — same visibility floor as the course list. Not
  // access-gated beyond that: seeing that an exam exists costs nothing;
  // the gate bites at start-attempt time for course-linked exams.
  //
  // Unpaginated on purpose — the exam detail page ([slug]/page.tsx)
  // resolves its exam by scanning this same full list rather than a
  // separate by-id lookup, so this route's contract (bare array, every
  // published exam) must stay stable. The /mock-tests list page uses the
  // separate paginated `page` route below instead.
  @Get()
  @Security('session')
  public async listPublished(): Promise<MockExamSummaryEntry[]> {
    const exams = await mockExamRepository.listPublished();
    return exams.map(toSummaryEntry);
  }

  // Paginated twin of the route above, for the /mock-tests card/list
  // toggle + "Show more" (same shape as GET /blog's page contract).
  @Get('page')
  @Security('session')
  public async listPublishedPage(@Query() limit?: string, @Query() offset?: string): Promise<MockExamSummaryPage> {
    const parsedLimit = limit === undefined ? DEFAULT_PAGE_SIZE : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const { exams, total } = await mockExamRepository.listPublishedPage(pageSize, pageOffset);
    return { exams: exams.map(toSummaryEntry), total };
  }

  // Starts an attempt: freezes the random draw (easy -> medium -> hard) into
  // the attempt row and returns the drawn questions WITHOUT answers. No
  // resume support by design — refreshing mid-test abandons the attempt and
  // a fresh Start draws again; orphaned in_progress rows are accepted v1
  // behavior.
  @Post('{examId}/attempts')
  @Security('session')
  public async startAttempt(
    @Path() examId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() conflict: TsoaResponse<409, MockExamMessageResponse>,
  ): Promise<MockExamStartResponse | void> {
    const user = request.user as User;
    const exam = await mockExamRepository.findPublishedById(examId);
    if (!exam) return notFound(404);
    if (exam.courseId && !(await hasFullCourseAccess(user, exam.courseId))) return notFound(404);

    const split: DrawSplit = MockExamRepository.computeDrawSplit(exam.liveQuestionCount, {
      easy: exam.easyCount,
      medium: exam.mediumCount,
      hard: exam.hardCount,
    });
    const questionIds = await mockExamRepository.drawQuestionIds(exam.id, split);
    if (!questionIds || questionIds.length === 0) {
      return conflict(409, { message: 'This exam has not enough questions in its bank yet. Please try again later.' });
    }
    const attempt = await mockExamAttemptRepository.create(user.id, exam.id, questionIds, questionIds.length);
    const questions = await mockExamRepository.listQuestionsByIds(questionIds);
    const byId = new Map(questions.map((q) => [q.id, q]));
    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes,
      // Frozen-draw order preserved: easy block first, then medium, then hard.
      questions: questionIds.flatMap((id) => {
        const question = byId.get(id);
        return question ? [toView(question)] : [];
      }),
    };
  }
}
