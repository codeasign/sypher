import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CodingProblemDetail as CodingProblemDetailData } from '@/data/codingProblems';
import CodingProblemDetail from '@/components/CodingProblemDetail';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

async function fetchProblem(slugPath: string): Promise<CodingProblemDetailData | null> {
  const res = await serverApiFetch(`/coding-problems/${slugPath}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load problem (${res.status})`);
  const data = await res.json();
  return data ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const problem = await fetchProblem(slug.join('/'));
  if (!problem) return { title: 'Practice Coding' };
  return { title: `${problem.title} — Practice Coding`, description: `${problem.title} (${problem.difficulty}) — ${problem.categoryLabel} practice problem with a built-in IDE and verified solutions.` };
}

export default async function PracticeCodingProblemPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const problem = await fetchProblem(slug.join('/'));
  if (!problem) notFound();

  return <CodingProblemDetail problem={problem} />;
}
