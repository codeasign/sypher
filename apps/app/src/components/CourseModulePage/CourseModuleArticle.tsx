'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import CodeBlock from '@/components/BlogPostPage/CodeBlock';
import { ModuleBookmarkButton } from '@/components/AuthoredBookmarkButton';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

// defaultSchema doesn't allow `id` on headings (it's stripped by default to
// prevent id-collision/targeting attacks on arbitrary tags) -- rehype-slug
// adds one to every heading so CourseTableOfContents's <a href="#id"> links
// and scroll-spy have something to target, so headings specifically need it
// allow-listed rather than opening `id` up on every tag.
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
  attributes: {
    ...defaultSchema.attributes,
    ...Object.fromEntries(
      HEADING_TAGS.map((tag) => [tag, [...(defaultSchema.attributes?.[tag] ?? []), 'id']])
    ),
  },
};

interface AdjacentModule {
  slug: string;
  title: string;
}

interface CourseModuleArticleProps {
  courseId?: string;
  moduleId?: string;
  courseSlug: string;
  courseName?: string;
  moduleSlug: string;
  title: string;
  content: string;
  prevModule?: AdjacentModule | null;
  nextModule?: AdjacentModule | null;
  trackView?: boolean;
}

export default function CourseModuleArticle({
  courseId,
  moduleId,
  courseSlug,
  courseName,
  moduleSlug,
  title,
  content,
  prevModule,
  nextModule,
  trackView = true,
}: CourseModuleArticleProps): React.JSX.Element {
  useEffect(() => {
    if (trackView) trackEvent('course_module_view', { course_slug: courseSlug, module_slug: moduleSlug, title });
  }, [courseSlug, moduleSlug, title, trackView]);

  return (
    <article className={styles.article}>
      {courseName && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/dashboard" className={styles.breadcrumbLink} aria-label="Home">
            <HomeRoundedIcon className={styles.breadcrumbHomeIcon} />
          </Link>
          <span className={styles.breadcrumbSep}>&gt;</span>
          <Link href={`/courses/${courseSlug}`} className={styles.breadcrumbLink}>
            {courseName}
          </Link>
          <span className={styles.breadcrumbSep}>&gt;</span>
          <span className={styles.breadcrumbCurrent}>{moduleSlug}</span>
        </nav>
      )}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {courseId && moduleId && <ModuleBookmarkButton moduleId={moduleId} courseId={courseId} />}
      </div>
      <div className={styles.body}>
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, schema]]}
          components={{ pre: CodeBlock }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {(prevModule || nextModule) && (
        <nav className={styles.pagination} aria-label="Module pagination">
          {prevModule ? (
            <Link href={`/courses/${courseSlug}/${prevModule.slug}`} className={`${styles.pageLink} ${styles.pagePrev}`}>
              <span className={styles.pageLabel}>
                <KeyboardDoubleArrowLeftIcon className={styles.pageArrowIcon} />
                Previous
              </span>
              <span className={styles.pageTitle}>{prevModule.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextModule && (
            <Link href={`/courses/${courseSlug}/${nextModule.slug}`} className={`${styles.pageLink} ${styles.pageNext}`}>
              <span className={styles.pageLabel}>
                Next
                <KeyboardDoubleArrowRightIcon className={styles.pageArrowIcon} />
              </span>
              <span className={styles.pageTitle}>{nextModule.title}</span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
