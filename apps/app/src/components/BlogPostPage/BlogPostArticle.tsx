import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import styles from './styles.module.css';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

interface BlogPostArticleProps {
  title: string;
  content: string;
  coverImageUrl: string | null;
  date: string | null;
}

// Explicit locale, not `undefined` -- see BlogList/index.tsx for why.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogPostArticle({ title, content, coverImageUrl, date }: BlogPostArticleProps): React.JSX.Element {
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
