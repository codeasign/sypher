'use client';

import type { ReactNode } from 'react';
import styles from './styles.module.css';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

/**
 * Rule 6 tooltip (apps/web design language). Wraps any focusable trigger —
 * button, link, icon — and shows a themed hint ABOVE it on hover or
 * keyboard focus. Uses :focus-within, so natively focusable children
 * supply their own tab stop (no double-stopping); plain decorative spans
 * need their own tabIndex if keyboard access matters.
 *
 * Colors are the inverse-surface pair (--ifm-font-color-base on
 * --ifm-background-surface-color), which flips automatically with the
 * dark/light theme — never override them per call site.
 */
export default function Tooltip({ label, children }: TooltipProps): React.JSX.Element {
  return (
    <span className={styles.trigger}>
      {children}
      <span className={styles.tooltip} role="tooltip">
        {label}
      </span>
    </span>
  );
}
