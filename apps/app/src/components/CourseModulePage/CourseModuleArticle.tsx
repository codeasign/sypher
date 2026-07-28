'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import CodeBlock from '@/components/BlogPostPage/CodeBlock';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

interface CourseModuleArticleProps {
  courseSlug: string;
  moduleSlug: string;
  title: string;
  content: string;
  trackView?: boolean;
}

export default function CourseModuleArticle({
  courseSlug,
  moduleSlug,
  title,
  content,
  trackView = true,
}: CourseModuleArticleProps): React.JSX.Element {
  useEffect(() => {
    if (trackView) trackEvent('course_module_view', { course_slug: courseSlug, module_slug: moduleSlug, title });
  }, [courseSlug, moduleSlug, title, trackView]);

  return (
    <article className={styles.article}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.body}>
        <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={{ pre: CodeBlock }}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
