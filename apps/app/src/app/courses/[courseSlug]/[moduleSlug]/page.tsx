import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import CourseModuleArticle from '@/components/CourseModulePage/CourseModuleArticle';
import CourseShell from '@/components/CourseShell';
import CourseTableOfContents from '@/components/CourseTableOfContents';
import { getCachedCourseBySlug, getCachedCourseModuleBySlug, getCachedCourseModules } from '@/data/coursesCached';
import { getCourseAccessStatus, isSignedIn } from '@/lib/courseAccess';
import { extractHeadings } from '@/lib/extractHeadings';
import styles from '@/components/CourseModulePage/styles.module.css';

// Only module_type='content' renders yet (see SupabaseSchema.md "Course
// authoring") -- other types 404 for now rather than partially rendering.
async function resolveModule(courseSlug: string, moduleSlug: string) {
  const course = await getCachedCourseBySlug(courseSlug);
  if (!course) return null;
  const mod = await getCachedCourseModuleBySlug(course.id, moduleSlug);
  if (!mod || mod.module_type !== 'content') return null;
  return { course, module: mod };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug, moduleSlug } = await params;
  const resolved = await resolveModule(courseSlug, moduleSlug);
  if (!resolved) return {};
  const { course, module: mod } = resolved;

  // Flipped fetch/gate order (design note 3): a Getting-Started-flagged
  // module skips the course-access RPC entirely and only requires a
  // session (Phase 9 revision -- was fully public, no login required, but
  // that meant a signed-out visitor never got a login prompt at all).
  // Everything else runs the same check the page body runs, so an
  // unauthorized visitor doesn't see the title in metadata either.
  if (mod.show_in_getting_started) {
    if (!(await isSignedIn())) return {};
  } else {
    const access = await getCourseAccessStatus(course.id);
    if (access !== 'granted') return {};
  }

  return {
    title: `${mod.title} — ${course.name}`,
  };
}

export default async function CourseModulePage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const resolved = await resolveModule(courseSlug, moduleSlug);
  if (!resolved) notFound();
  const { course, module: mod } = resolved;

  // Design note 3 (revised, Phase 9): fetch course -> fetch module -> if
  // show_in_getting_started, only require a session (no course-grant
  // check) -- else run the full access check the course home page runs.
  // Getting-Started rows are meant to help a signed-in visitor who has no
  // course grant yet; they're no longer meant to be visible with zero
  // session at all, since that left signed-out visitors with no path to a
  // login prompt.
  if (mod.show_in_getting_started) {
    if (!(await isSignedIn())) redirect('/login');
  } else {
    const access = await getCourseAccessStatus(course.id);
    if (access === 'unauthenticated') redirect('/login');
    if (access === 'forbidden') notFound();
  }

  // Reuses the same cached, order_index-sorted module list for both the
  // sidebar (CourseShell) and prev/next -- no new data-fetch shape, and
  // this only runs after the access gate above has already passed, so the
  // sidebar's module list is never fetched (let alone rendered) for a
  // forbidden request.
  const modules = await getCachedCourseModules(course.id);
  const contentModules = (modules as { id: string; slug: string; title: string; module_type: string }[]).filter(
    (m) => m.module_type === 'content'
  );
  const currentIndex = contentModules.findIndex((m) => m.id === mod.id);
  const prevModule = currentIndex > 0 ? contentModules[currentIndex - 1] : null;
  const nextModule =
    currentIndex >= 0 && currentIndex < contentModules.length - 1 ? contentModules[currentIndex + 1] : null;

  const headings = extractHeadings(mod.body_mdx);

  return (
    <CourseShell courseSlug={course.slug} courseName={course.name} modules={contentModules}>
      <div className={styles.page}>
        <div className={styles.moduleLayout}>
          <div className={styles.articleCol}>
            <CourseModuleArticle
              courseId={course.id}
              moduleId={mod.id}
              courseSlug={course.slug}
              courseName={course.name}
              moduleSlug={mod.slug}
              title={mod.title}
              content={mod.body_mdx}
              prevModule={prevModule ? { slug: prevModule.slug, title: prevModule.title } : null}
              nextModule={nextModule ? { slug: nextModule.slug, title: nextModule.title } : null}
            />
          </div>
          <CourseTableOfContents headings={headings} />
        </div>
      </div>
    </CourseShell>
  );
}
