'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

interface BlogPostArticleProps {
  slug: string;
  title: string;
  content: string;
  coverImageUrl: string | null;
  date: string | null;
  trackView?: boolean;
}

// Explicit locale, not `undefined` -- see BlogList/index.tsx for why.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPostArticle({ slug, title, content, coverImageUrl, date, trackView = true }: BlogPostArticleProps): React.JSX.Element {
  useEffect(() => {
    if (trackView) trackEvent('blog_post_view', { slug, title });
  }, [slug, title, trackView]);

  return (
    <article className={styles.article}>
      {coverImageUrl && <img src={coverImageUrl} alt={title} className={styles.coverImage} />}
      <h1 className={styles.title}>{title}</h1>
      {date && <p className={styles.date}>{formatDate(date)}</p>}
      <div className={styles.body}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
          components={{ pre: CodeBlock }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
