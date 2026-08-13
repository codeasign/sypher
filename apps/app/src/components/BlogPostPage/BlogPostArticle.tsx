'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
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
  authorName?: string | null;
  authorBio?: string | null;
  trackView?: boolean;
  showBackLink?: boolean;
}

// Explicit locale, not `undefined` -- see BlogList/index.tsx for why.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPostArticle({
  slug,
  title,
  content,
  coverImageUrl,
  date,
  authorName,
  authorBio,
  trackView = true,
  showBackLink = true,
}: BlogPostArticleProps): React.JSX.Element {
  useEffect(() => {
    if (trackView) trackEvent('blog_post_view', { slug, title });
  }, [slug, title, trackView]);

  return (
    <article className={styles.article}>
      {showBackLink && (
        <Link href="/blog" className={styles.backLink}>
          ← Back to Blog
        </Link>
      )}
      {coverImageUrl && <img src={coverImageUrl} alt={title} className={styles.coverImage} />}
      <h1 className={styles.title}>{title}</h1>
      {date && (
        <p className={styles.date}>
          <span className={styles.dateLabel}>Posted On:</span> {formatDate(date)}
        </p>
      )}
      <div className={styles.body}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
          components={{ pre: CodeBlock }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {authorBio && (
        <div className={styles.authorCard}>
          <div className={styles.authorMeta}>
            <p className={styles.authorLabel}>Written by</p>
            {authorName && <p className={styles.authorName}>{authorName}</p>}
          </div>
          <div className={styles.authorAbout}>
            <p className={styles.authorLabel}>About author</p>
            <p className={styles.authorBio}>{authorBio}</p>
          </div>
        </div>
      )}
    </article>
  );
}
