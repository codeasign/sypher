'use client';

import React, { useRef, useState, isValidElement } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import clsx from 'clsx';
import { useColorMode } from '@/hooks/useColorMode';
import styles from './styles.module.css';

// apps/web has no MUI (apps/app does) — plain inline SVGs instead of
// @mui/icons-material's ContentCopyRoundedIcon/CheckRoundedIcon.
function CopyIcon(): React.JSX.Element {
  return (
    <svg className={styles.copyButtonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg className={styles.copyButtonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function extractCodeInfo(children: React.ReactNode): { code: string; language: string | null } {
  const child = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(child)) {
    return { code: String(children ?? ''), language: null };
  }
  const props = child.props as { className?: string; children?: React.ReactNode };
  const match = /language-(\w+)/.exec(props.className ?? '');
  const code = String(props.children ?? '').replace(/\n$/, '');
  return { code, language: match ? match[1] : null };
}

export default function CodeBlock(props: React.HTMLAttributes<HTMLPreElement>): React.JSX.Element {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const { code, language } = extractCodeInfo(props.children);

  async function handleCopy(): Promise<void> {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Matches apps/app's CodeBlock exactly — same theme pair, same mapping.
  const { colorMode } = useColorMode();
  const theme = colorMode === 'dark' ? themes.dracula : themes.github;

  return (
    <div className={styles.codeBlockWrapper}>
      <button type="button" className={styles.copyButton} onClick={handleCopy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <Highlight theme={theme} code={code} language={language ?? 'text'}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre ref={preRef} className={clsx(styles.codeBlockPre, className)} style={style}>
            {tokens.map((line, i) => (
              <span key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
                {'\n'}
              </span>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
