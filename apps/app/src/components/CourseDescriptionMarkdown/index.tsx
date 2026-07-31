'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

interface CourseDescriptionMarkdownProps {
  text: string;
  className?: string;
}

export default function CourseDescriptionMarkdown({
  text,
  className,
}: CourseDescriptionMarkdownProps): React.JSX.Element {
  return (
    <div className={className}>
      <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}>{text}</ReactMarkdown>
    </div>
  );
}
