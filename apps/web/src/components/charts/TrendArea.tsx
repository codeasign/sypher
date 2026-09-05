import styles from './charts.module.css';

interface TrendAreaProps {
  /** Each point's value is a 0-100 score. */
  points: { label: string; value: number; date?: string }[];
  ariaLabel: string;
  /** Line/area colour (any CSS colour). Defaults to the theme primary. */
  accent?: string;
}

/**
 * Dependency-free line + area chart on a fixed 0-100 scale (mock-exam
 * scores). Needs at least two points; the caller decides what to show
 * otherwise. Colour follows `--chart-accent` (set via the `accent` prop).
 */
export default function TrendArea({ points, ariaLabel, accent }: TrendAreaProps): React.JSX.Element {
  const width = 320;
  const height = 140;
  const pad = { top: 10, right: 6, bottom: 18, left: 6 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const x = (i: number): number => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number): number => pad.top + innerH - (Math.min(100, Math.max(0, v)) / 100) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${pad.top + innerH} L ${x(0).toFixed(1)} ${pad.top + innerH} Z`;

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={accent ? ({ '--chart-accent': accent } as React.CSSProperties) : undefined}
    >
      {[0, 50, 100].map((g) => (
        <line key={g} x1={pad.left} x2={pad.left + innerW} y1={y(g)} y2={y(g)} className={styles.grid} />
      ))}
      <path d={area} className={styles.area} />
      <path d={line} className={styles.line} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={3} className={styles.dot}>
          <title>{`${p.label}: ${p.value}%`}</title>
        </circle>
      ))}
      <text x={pad.left} y={height - 4} className={styles.tick} textAnchor="start">
        {points[0]?.label}
      </text>
      {points.length > 1 && (
        <text x={pad.left + innerW} y={height - 4} className={styles.tick} textAnchor="end">
          {points[points.length - 1]?.label}
        </text>
      )}
    </svg>
  );
}
