import { apiFetch } from '@/lib/api';

export interface CodingProblemSummary {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  title: string;
  difficulty: string;
  orderIndex: number;
}

export interface CodingProblemDetail {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  title: string;
  difficulty: string;
  bodyMd: string;
  timeLimitSeconds: number;
  memoryLimitKb: number;
  defaultLanguage: string;
  starterCode: Record<string, string>;
  harness: Record<string, string>;
  sampleTestCases: { stdin: string; expectedOutput: string }[];
  testCaseCount: number;
  solutionsMd: Record<string, string>;
}

async function assertOk(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`${action} failed: ${res.status} ${res.statusText}`);
  }
}

export async function listMyCodingProblemBookmarks(): Promise<string[]> {
  const res = await apiFetch('/coding-problems/bookmarks/mine');
  return res.ok ? ((await res.json()) as string[]) : [];
}

export async function addCodingProblemBookmark(problemId: string): Promise<void> {
  await assertOk(await apiFetch(`/coding-problems/${problemId}/bookmark`, { method: 'POST' }), 'Add problem bookmark');
}

export async function removeCodingProblemBookmark(problemId: string): Promise<void> {
  await assertOk(await apiFetch(`/coding-problems/${problemId}/bookmark`, { method: 'DELETE' }), 'Remove problem bookmark');
}
