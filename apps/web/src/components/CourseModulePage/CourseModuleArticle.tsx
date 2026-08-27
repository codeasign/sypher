'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import CodeBlock from '@/components/BlogPostPage/CodeBlock';
import styles from './styles.module.css';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

interface CourseModuleArticleProps {
  title: string;
  content: string;
}

export default function CourseModuleArticle({ title, content }: CourseModuleArticleProps): React.JSX.Element {
  return (
    <article className={styles.article}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.body}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={{ pre: CodeBlock }}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
