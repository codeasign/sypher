import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import CohortArticle from '@/components/CohortPostPage/CohortArticle';
import type { Cohort } from '@/data/cohorts';
import styles from '@/components/CohortPostPage/styles.module.css';

async function fetchCohort(slug: string): Promise<Cohort | null> {
  const res = await serverApiFetch(`/cohorts/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cohort = await fetchCohort(slug);
  if (!cohort) return {};

  return {
    title: cohort.title,
    description: cohort.description,
    openGraph: {
      title: cohort.title,
      description: cohort.description,
      type: 'article',
      images: cohort.coverImageUrl ? [cohort.coverImageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: cohort.title,
      description: cohort.description,
      images: cohort.coverImageUrl ? [cohort.coverImageUrl] : undefined,
    },
  };
}

export default async function CohortDetailPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const cohort = await fetchCohort(slug);
  if (!cohort) notFound();

  return (
    <div className={styles.page}>
      <CohortArticle
        slug={slug}
        title={cohort.title}
        content={cohort.content}
        coverImageUrl={cohort.coverImageUrl}
        startDate={cohort.startDate}
        durationWeeks={cohort.durationWeeks}
        seatsTotal={cohort.seatsTotal}
        priceLabel={cohort.priceLabel}
      />
    </div>
  );
}
