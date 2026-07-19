import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JobPostArticle from '@/components/JobPostPage/JobPostArticle';
import { getCachedOpenJobPosts, getCachedJobPostBySlug } from '@/data/jobPostsCached';
import styles from '@/components/JobPostPage/styles.module.css';

export async function generateStaticParams() {
  const posts = await getCachedOpenJobPosts();
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedJobPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} at ${post.company_name}`,
    description: post.description,
    openGraph: {
      title: `${post.title} at ${post.company_name}`,
      description: post.description,
      type: 'article',
    },
  };
}

export default async function JobPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getCachedJobPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className={styles.page}>
      <JobPostArticle
        title={post.title}
        companyName={post.company_name}
        description={post.description}
        location={post.location}
        employmentType={post.employment_type}
        workMode={post.work_mode}
        experienceLevel={post.experience_level}
        salaryMin={post.salary_min}
        salaryMax={post.salary_max}
        applyUrl={post.apply_url}
        applyEmail={post.apply_email}
      />
    </div>
  );
}
