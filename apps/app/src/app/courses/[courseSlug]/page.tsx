import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  getCachedPublishedCourseSlugs,
  getCachedCourseBySlug,
  getCachedCourseModules,
} from '@/data/coursesCached';
import { getCourseAccessStatus } from '@/lib/courseAccess';
import styles from './styles.module.css';

export async function generateStaticParams() {
  const slugs = await getCachedPublishedCourseSlugs();
  return slugs.map((c: { slug: string }) => ({ courseSlug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = await getCachedCourseBySlug(courseSlug);
  if (!course) return {};

  // Same access check as the page body -- an unauthorized visitor must not
  // see the course's title/description in metadata either.
  const access = await getCourseAccessStatus(course.id);
  if (access !== 'granted') return {};

  return {
    title: course.name,
    description: course.description ?? undefined,
    openGraph: {
      title: course.name,
      description: course.description ?? undefined,
      type: 'website',
      images: course.cover_image_url ? [course.cover_image_url] : undefined,
    },
  };
}

export default async function CourseHomePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getCachedCourseBySlug(courseSlug);
  if (!course) notFound();

  // Course home stays gated unconditionally, even if every module inside
  // happens to be show_in_getting_started -- only the individual module
  // route skips the gate for those (design note 3), never the course home.
  const access = await getCourseAccessStatus(course.id);
  if (access === 'unauthenticated') redirect('/login');
  if (access === 'forbidden') notFound();

  const modules = await getCachedCourseModules(course.id);
  // Only module_type='content' renders anywhere yet -- see SupabaseSchema.md
  // "Course authoring" and CourseModuleArticle's notFound() for other types.
  const contentModules = (modules as { id: string; slug: string; title: string; module_type: string }[]).filter(
    (m) => m.module_type === 'content'
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{course.name}</h1>
          {course.description && <p className={styles.description}>{course.description}</p>}
        </div>
        {contentModules.length === 0 ? (
          <p className={styles.empty}>No modules published yet.</p>
        ) : (
          <ul className={styles.moduleList}>
            {contentModules.map((m) => (
              <li key={m.id} className={styles.moduleRow}>
                <Link href={`/courses/${course.slug}/${m.slug}`} className={styles.moduleLink}>
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
