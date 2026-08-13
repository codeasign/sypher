import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CohortArticle from '@/components/CohortPostPage/CohortArticle';
import { getCachedLiveCohorts, getCachedCohortBySlug } from '@/data/cohortsCached';
import styles from '@/components/CohortPostPage/styles.module.css';

export async function generateStaticParams() {
  const cohorts = await getCachedLiveCohorts();
  return cohorts.map((cohort: { slug: string }) => ({ slug: cohort.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cohort = await getCachedCohortBySlug(slug);
  if (!cohort) return {};

  return {
    title: cohort.title,
    description: cohort.description,
    openGraph: {
      title: cohort.title,
      description: cohort.description,
      type: 'article',
      images: cohort.cover_image_url ? [cohort.cover_image_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: cohort.title,
      description: cohort.description,
      images: cohort.cover_image_url ? [cohort.cover_image_url] : undefined,
    },
  };
}

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cohort = await getCachedCohortBySlug(slug);
  if (!cohort) notFound();

  return (
    <div className={styles.page}>
      <CohortArticle
        slug={slug}
        title={cohort.title}
        content={cohort.content}
        coverImageUrl={cohort.cover_image_url}
        startDate={cohort.start_date}
        durationWeeks={cohort.duration_weeks}
        seatsTotal={cohort.seats_total}
        priceLabel={cohort.price_label}
      />
    </div>
  );
}
