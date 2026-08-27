'use client';

import React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import PdfEmbed from '@/components/PdfEmbed';
import YouTube from '@/components/YouTube';
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
  featuredMediaType?: 'pdf' | 'youtube' | null;
  featuredMediaValue?: string | null;
  date: string | null;
  authorName?: string | null;
  authorBio?: string | null;
  showBackLink?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPostArticle({
  slug,
  title,
  content,
  coverImageUrl,
  featuredMediaType,
  featuredMediaValue,
  date,
  authorName,
  authorBio,
  showBackLink = true,
}: BlogPostArticleProps): React.JSX.Element {
  return (
    <article>
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
      {featuredMediaType === 'pdf' && featuredMediaValue && <PdfEmbed src={featuredMediaValue} title={title} />}
      {featuredMediaType === 'youtube' && featuredMediaValue && <YouTube id={featuredMediaValue} title={title} />}
      <div className={styles.body}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
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
