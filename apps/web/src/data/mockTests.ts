import { apiFetch } from '@/lib/api';

// Mirrors apps/api's MockExamSummaryEntry — what GET /mock-exams returns.
export interface MockExamSummary {
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

export interface MockExamSummaryPage {
  exams: MockExamSummary[];
  total: number;
}

// GET /mock-exams/page — the paginated twin of the plain list endpoint
// (which stays unpaginated for the exam-detail page's full-list lookup).
// Used client-side by MockExamList's "Show more".
export async function fetchMockExamPage(limit: number, offset: number): Promise<MockExamSummaryPage> {
  const res = await apiFetch(`/mock-exams/page?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return res.json();
}

// Pre-submit question view — options carry the full key -> text map so the
// runner renders "A. <text>"; correctAnswer/explanation never appear in
// this shape (stripped server-side).
export interface MockTestQuestionView {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  question: string;
  options: Record<string, string>;
}

export interface MockTestStartResponse {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  questions: MockTestQuestionView[];
}

// Post-submit review — the only shape that ever carries answers.
export interface MockTestResultQuestion {
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

export interface MockTestResultResponse {
  attemptId: string;
  examTitle: string;
  durationMinutes: number;
  // Pairs with submittedAt so the results screen can show time taken.
  startedAt: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  questions: MockTestResultQuestion[];
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

// Client-component consumers only (MockTestRunner); the list/detail pages
// are Server Components going through serverApiFetch instead.
export async function startMockAttempt(
  examId: string,
): Promise<{ error: string | null; start: MockTestStartResponse | null }> {
  const res = await apiFetch(`/mock-exams/${examId}/attempts`, { method: 'POST' });
  if (!res.ok) return { error: await asError(res), start: null };
  return { error: null, start: await res.json() };
}

export async function submitMockAttempt(
  attemptId: string,
  answers: { questionId: string; selectedAnswer: string[] }[],
): Promise<{ error: string | null; result: MockTestResultResponse | null }> {
  const res = await apiFetch(`/attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
  if (!res.ok) return { error: await asError(res), result: null };
  return { error: null, result: await res.json() };
}
