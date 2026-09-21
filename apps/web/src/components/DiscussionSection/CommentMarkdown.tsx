'use client';

import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { CommentView } from '@/data/comments';
import styles from './styles.module.css';

// Underline has no Markdown syntax, so the composer writes <u>…</u> (same
// convention as CourseDescriptionMarkdown). Everything else raw is stripped.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
};

// Only what the composer toolbar can produce (plus autolinks and quotes).
// Headings, images, tables etc. fall back to their plain text.
const ALLOWED_ELEMENTS = ['p', 'br', 'strong', 'em', 'del', 'u', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'blockquote'];

/**
 * Renders ONLY tracked mentions as chips: body tokens matching one of the
 * comment's CommentMention usernames (userId-keyed rows resolved at read
 * time). Free-typed "@text" that never came from the dropdown has no
 * matching mention row and stays plain — deliberately, per spec §11.
 */
function renderMentions(body: string, mentions: CommentView['mentions']): React.JSX.Element[] {
  if (mentions.length === 0) return [<span key="body">{body}</span>];
  const escaped = mentions.map((m) => m.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(^|\\s)@(${escaped.join('|')})(?=\\s|$|[^a-z0-9_])`, 'gi');
  const parts: React.JSX.Element[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const username = match[2];
    const tokenStart = match.index + match[1].length;
    if (tokenStart > last) parts.push(<span key={key++}>{body.slice(last, tokenStart)}</span>);
    parts.push(
      <span key={key++} className={styles.mentionChip}>
        @{username}
      </span>,
    );
    last = tokenStart + username.length + 1;
    if (match.index === re.lastIndex) re.lastIndex += 1; // zero-length safety
  }
  if (last < body.length) parts.push(<span key={key++}>{body.slice(last)}</span>);
  return parts;
}

// Same limit as normalizeCommentBody in apps/api/src/lib/commentAccess.ts.
// The API rejects deeper nesting on write; this covers anything already
// stored, since a few thousand stacked "> " / "- " markers overflow the
// renderer's call stack (and cost seconds of CPU first).
const MAX_BLOCK_NESTING = 8;
const LEADING_BLOCK_MARKER_RE = /^[ \t]{0,3}(?:>|[-*+]|\d{1,9}[.)])[ \t]?/;

function hasExcessiveNesting(body: string): boolean {
  for (const line of body.split(/\r?\n/)) {
    let rest = line;
    let depth = 0;
    let match: RegExpExecArray | null;
    while ((match = LEADING_BLOCK_MARKER_RE.exec(rest)) !== null) {
      depth += 1;
      if (depth > MAX_BLOCK_NESTING) return true;
      rest = rest.slice(match[0].length);
    }
  }
  return false;
}

/** Last line of defence: a comment that still fails to render shows as plain text instead of taking the thread down. */
class RenderBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface CommentMarkdownProps {
  body: string;
  mentions: CommentView['mentions'];
}

export default function CommentMarkdown({ body, mentions }: CommentMarkdownProps): React.JSX.Element {
  // Mention chips are applied to text inside prose elements only — never
  // inside code, where "@name" is literal.
  const withMentions = (children: React.ReactNode): React.ReactNode =>
    React.Children.map(children, (child) =>
      typeof child === 'string' ? <>{renderMentions(child, mentions)}</> : child,
    );

  const components: Components = {
    p: ({ children }) => <p>{withMentions(children)}</p>,
    li: ({ children }) => <li>{withMentions(children)}</li>,
    strong: ({ children }) => <strong>{withMentions(children)}</strong>,
    em: ({ children }) => <em>{withMentions(children)}</em>,
    del: ({ children }) => <del>{withMentions(children)}</del>,
    u: ({ children }) => <u>{withMentions(children)}</u>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ),
  };

  const plain = (
    <div className={styles.commentBody} style={{ whiteSpace: 'pre-wrap' }}>
      {body}
    </div>
  );
  if (hasExcessiveNesting(body)) return plain;

  return (
    <RenderBoundary fallback={plain}>
      <div className={styles.commentBody}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
          allowedElements={ALLOWED_ELEMENTS}
          unwrapDisallowed
          components={components}
        >
          {body}
        </ReactMarkdown>
      </div>
    </RenderBoundary>
  );
}
