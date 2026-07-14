'use client';

import React, { useRef, useState, isValidElement } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { useColorMode } from '@/hooks/useColorMode';
import clsx from 'clsx';
import styles from './styles.module.css';

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
  const { colorMode } = useColorMode();
  const { code, language } = extractCodeInfo(props.children);

  async function handleCopy(): Promise<void> {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const theme = colorMode === 'dark' ? themes.dracula : themes.github;

  return (
    <div className={styles.codeBlockWrapper}>
      <button type="button" className={styles.copyButton} onClick={handleCopy}>
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
