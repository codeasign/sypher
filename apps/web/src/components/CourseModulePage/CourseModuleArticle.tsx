'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useParams } from 'next/navigation';
import CodeBlock from '@/components/BlogPostPage/CodeBlock';
import styles from './styles.module.css';
import { courseMarkdownSchema } from './markdownSchema.mjs';
import { getCourseThemeClass } from './courseThemes';

interface CourseModuleArticleProps {
  title: string;
  content: string;
  /**
   * Course slug, used to apply a course-only theme (see courseThemes/). Optional:
   * on the reader route (/learn/[slug]/...) it is read from the URL, so callers
   * that already sit on that route do not need to pass it.
   */
  courseSlug?: string;
}

export default function CourseModuleArticle({ title, content, courseSlug }: CourseModuleArticleProps): React.JSX.Element {
  const params = useParams();
  const routeSlug = typeof params?.slug === 'string' ? params.slug : undefined;
  const themeClass = getCourseThemeClass(courseSlug ?? routeSlug);

  return (
    <article className={styles.article}>
      <h1 className={styles.title}>{title}</h1>
      <div className={themeClass ? `${styles.body} ${themeClass}` : styles.body}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw, [rehypeSanitize, courseMarkdownSchema]]} components={{ pre: CodeBlock }}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
