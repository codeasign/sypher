import styles from './charts.module.css';

interface ProgressRingProps {
  /** 0-100. */
  percent: number;
  /** Big centre text (defaults to `${percent}%`). */
  centerLabel?: string;
  /** Small text under the centre label. */
  caption?: string;
  size?: number;
  ariaLabel: string;
  /** Value-arc colour (any CSS colour). Defaults to the theme primary. */
  accent?: string;
}

/**
 * Dependency-free donut. Track + value arc drawn with stroke-dasharray on
 * two circles; the value arc uses `--chart-accent` (set via `accent`).
 */
export default function ProgressRing({ percent, centerLabel, caption, size = 132, ariaLabel, accent }: ProgressRingProps): React.JSX.Element {
  const pct = Math.min(100, Math.max(0, percent));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div
      className={styles.ringWrap}
      style={{ width: size, height: size, ...(accent ? ({ '--chart-accent': accent } as React.CSSProperties) : {}) }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={styles.ringValue}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringValueText}>{centerLabel ?? `${Math.round(pct)}%`}</span>
        {caption && <span className={styles.ringCaption}>{caption}</span>}
      </div>
    </div>
  );
}
