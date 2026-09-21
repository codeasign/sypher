'use client';

import { Check, Copy } from 'lucide-react';
import React, { useRef, useState, isValidElement } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import clsx from 'clsx';
import { useColorMode } from '@/hooks/useColorMode';
import '@/lib/prismLanguages';
import styles from './styles.module.css';

// Lucide Copy / Check glyphs, sized via styles.copyButtonIcon.
function CopyIcon(): React.JSX.Element {
  return (
    <Copy className={styles.copyButtonIcon} />
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <Check className={styles.copyButtonIcon} />
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

  // Switched from the github/dracula pair (originally matching apps/app's
  // CodeBlock) to vsLight/vsDark -- github's light theme is subtle enough
  // to read as "unstyled" at a glance; VS Code's colors are unambiguous
  // and recognizable in both modes. apps/app is being retired, so cross-app
  // parity there no longer outweighs this app's own readability.
  const { colorMode } = useColorMode();
  const baseTheme = colorMode === 'dark' ? themes.vsDark : themes.vsLight;
  // vsLight's own background is #ffffff -- identical to the course-reader
  // card's --ifm-background-surface-color, so the block had zero visual
  // separation from the page around it (user report 2026-09-06: "add
  // background color to differentiate the codeblocks in light and dark
  // theme" -- vsDark's #1E1E1E vs the card's dark surface #17171b was
  // barely better). --ifm-color-emphasis-50 is this app's existing
  // "sunken surface" token (already used for table zebra-striping etc.) --
  // reusing it here keeps the block visibly inset from the card in BOTH
  // themes without inventing a new hardcoded color, and it stays
  // theme-aware automatically. Only `plain.backgroundColor` is overridden;
  // every syntax-token color from the base theme is untouched.
  const theme = {
    ...baseTheme,
    plain: { ...baseTheme.plain, backgroundColor: 'var(--ifm-color-emphasis-50)' },
  };

  return (
    <div className={styles.codeBlockWrapper}>
      <button
        type="button"
        className={copied ? `${styles.copyButton} ${styles.copyButtonCopied}` : styles.copyButton}
        onClick={handleCopy}
      >
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
