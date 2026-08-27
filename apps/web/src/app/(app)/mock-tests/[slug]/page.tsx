import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { MockExamSummary } from '@/data/mockTests';
import MockTestRunner from './MockTestRunner';
import styles from '../styles.module.css';

// The exam is resolved from the same GET /mock-exams list response the
// index page uses (no separate by-id endpoint needed at this scale) — an
// absent or unpublished slug simply notFounds.
async function fetchExam(slug: string): Promise<{ exam: MockExamSummary | null; unauthenticated: boolean }> {
  const res = await serverApiFetch('/mock-exams');
  if (res.status === 401) return { exam: null, unauthenticated: true };
  if (!res.ok) return { exam: null, unauthenticated: false };
  const exams: MockExamSummary[] = await res.json();
  return { exam: exams.find((exam) => exam.slug === slug) ?? null, unauthenticated: false };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { exam } = await fetchExam(slug);
  if (!exam) return {};
  return { title: exam.title, description: exam.description ?? undefined };
}

export default async function MockTestDetailPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const { exam, unauthenticated } = await fetchExam(slug);
  if (unauthenticated) redirect('/login');
  if (!exam) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/mock-tests" className={styles.backLink}>
          ← Mock Test
        </Link>
        <MockTestRunner exam={{ ...exam }} />
      </div>
    </div>
  );
}
