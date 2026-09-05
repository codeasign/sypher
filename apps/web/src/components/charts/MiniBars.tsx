import styles from './charts.module.css';

interface MiniBarsProps {
  data: { label: string; value: number }[];
  /** SVG height in px (width is fluid via viewBox). */
  height?: number;
  ariaLabel: string;
  /** Show every Nth label under the axis (default: first + last only). */
  labelEvery?: number;
  /** Bar colour (any CSS colour). Defaults to the theme primary. */
  accent?: string;
}

/**
 * Dependency-free vertical bar chart. Bars are normalised to the largest
 * value; an all-zero series renders a flat baseline. Colour comes from the
 * `--chart-accent` CSS var (set via the `accent` prop) so it follows the
 * theme by default.
 */
export default function MiniBars({ data, height = 140, ariaLabel, labelEvery, accent }: MiniBarsProps): React.JSX.Element {
  const width = 320;
  const pad = { top: 8, right: 4, bottom: 18, left: 4 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(3, slot * 0.6);

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={accent ? ({ '--chart-accent': accent } as React.CSSProperties) : undefined}
    >
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} className={styles.axis} />
      {data.map((d, i) => {
        const h = d.value <= 0 ? 0 : Math.max(2, (d.value / max) * innerH);
        const x = pad.left + i * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        const showLabel = labelEvery ? i % labelEvery === 0 : i === 0 || i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={2} className={styles.bar}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {showLabel && (
              <text x={pad.left + i * slot + slot / 2} y={height - 4} className={styles.tick} textAnchor="middle">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
