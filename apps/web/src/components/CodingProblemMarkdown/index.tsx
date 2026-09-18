'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import CodeBlock from '@/components/BlogPostPage/CodeBlock';
import { courseMarkdownSchema } from '@/components/CourseModulePage/markdownSchema.mjs';
// Reuses CourseModulePage's own CSS module (its `.body` class) instead of a
// duplicated copy — guarantees pixel-identical typography with course topic
// pages and the rest of the site, with zero risk of the two drifting apart
// later (user request 2026-09-18: "use that css" for the IDE description
// pane and Solutions page).
import styles from '@/components/CourseModulePage/styles.module.css';
import compact from './compact.module.css';

// Same react-markdown plugin stack as CourseModuleArticle (module bodies) —
// used here for the problem statement and per-language solution writeups,
// which don't need that component's full-page "paper sheet" chrome.
export default function CodingProblemMarkdown({ content, compact: isCompact = true }: { content: string; compact?: boolean }): React.JSX.Element {
  return (
    <div className={isCompact ? `${styles.body} ${compact.compact}` : styles.body}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw, [rehypeSanitize, courseMarkdownSchema]]} components={{ pre: CodeBlock }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
