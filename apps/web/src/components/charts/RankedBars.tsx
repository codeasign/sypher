import styles from './charts.module.css';

interface RankedBarsProps {
  /** Value is 0-100. `color` gives each row its own categorical identity
      (e.g. one chart-series slot per row) instead of one shared accent. */
  data: { label: string; value: number; color?: string }[];
  ariaLabel: string;
  /** Bar colour fallback when a row has no `color`. Defaults to the theme primary. */
  accent?: string;
  valueFormat?: (value: number) => string;
}

/**
 * Dependency-free horizontal ranked-bar list -- each row directly labelled
 * (name + value), so no separate legend is needed even with a distinct
 * colour per row. Built for category-by-magnitude data (e.g. score % per
 * exam domain) where row order already carries rank.
 */
export default function RankedBars({ data, ariaLabel, accent, valueFormat }: RankedBarsProps): React.JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.value));
  const format = valueFormat ?? ((v: number) => `${Math.round(v)}%`);

  return (
    <div
      className={styles.rankedList}
      role="img"
      aria-label={ariaLabel}
      style={accent ? ({ '--chart-accent': accent } as React.CSSProperties) : undefined}
    >
      {data.map((d) => (
        <div key={d.label} className={styles.rankedRow} title={`${d.label}: ${format(d.value)}`}>
          <span className={styles.rankedLabel}>{d.label}</span>
          <div className={styles.rankedTrack}>
            <div
              className={styles.rankedFill}
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: d.color ?? 'var(--chart-accent)' }}
            />
          </div>
          <span className={styles.rankedValue}>{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
