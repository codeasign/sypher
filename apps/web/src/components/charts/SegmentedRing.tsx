import styles from './charts.module.css';

interface Segment {
  key: string;
  value: number;
  /** Any CSS colour -- callers pass status colours (correct/wrong/etc.),
      never categorical hues, since a segment here is a state, not an identity. */
  color: string;
  /** Overrides `color` (outside position) or the white default (inside
      position) for just the data label text, not the arc itself -- for a
      segment colour too low-contrast on its own to read as text. */
  labelColor?: string;
}

interface SegmentedRingProps {
  segments: Segment[];
  total: number;
  /** Big centre text (defaults to the largest segment's share of total).
      Ignored in `variant="pie"` -- a full pie has no hole to put text in. */
  centerLabel?: string;
  /** Small text under the centre label. Same `pie` caveat as `centerLabel`. */
  caption?: string;
  size?: number;
  ariaLabel: string;
  /** 'donut' (default): hollow centre, room for centerLabel/caption, thin
      ring with rounded segment gaps. 'pie': solid disc, no centre text,
      segments butt against each other with no gap -- the classic pie look. */
  variant?: 'donut' | 'pie';
  /** Direct percent-of-total label per segment -- so a separate legend only
      needs to carry color-to-name identity, not the numbers too. Default true. */
  showDataLabels?: boolean;
  /** 'outside' (default): label sits just past the ring/pie's outer edge,
      colored to match its segment (needs extra canvas margin). 'inside':
      label sits centred within the coloured band/wedge itself, white by
      default (each segment's own colour is too close to its label color
      at that point to use as text) -- no extra canvas margin needed. */
  labelPosition?: 'outside' | 'inside';
}

// Reserved canvas margin so *outside* data labels never get clipped by the
// SVG's own bounding box -- the ring/pie itself still draws at exactly
// `size`, just centered in a slightly larger canvas. Not needed for
// `labelPosition="inside"`, where labels sit within the ring/pie itself.
const LABEL_PAD = 22;

/**
 * Dependency-free multi-segment donut/pie -- generalises ProgressRing's
 * single value arc to N segments, each its own colour. Both variants use
 * the same stroke-based technique (a pie is a donut whose stroke width
 * equals its radius, so the "ring" fills all the way to the centre).
 */
export default function SegmentedRing({
  segments,
  total,
  centerLabel,
  caption,
  size = 132,
  ariaLabel,
  variant = 'donut',
  showDataLabels = true,
  labelPosition = 'outside',
}: SegmentedRingProps): React.JSX.Element {
  const isPie = variant === 'pie';
  const isInside = labelPosition === 'inside';
  const maxR = size / 2;
  // Wider than a typical thin donut (was 14, then 26) so an inside data
  // label has real room to sit in -- still leaves a clear hole for
  // centerLabel/caption.
  const stroke = isPie ? maxR : 34;
  const r = isPie ? maxR / 2 : (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gapPx = isPie ? 0 : 3;
  const visible = segments.filter((s) => s.value > 0);

  const canvas = showDataLabels && !isInside ? size + LABEL_PAD * 2 : size;
  const cx = canvas / 2;
  const cy = canvas / 2;
  // Inside: dead centre of the coloured band/wedge (same radius the arc
  // itself is drawn at). Outside: just past the ring/pie's outer edge.
  const labelR = isInside ? r : maxR + 10;

  // Guarantee every visible segment a minimum sweep -- a lopsided split
  // (e.g. a user who left most questions unanswered) would otherwise draw
  // one dominant arc and one or two slivers too thin for their own label.
  // The degrees added to small segments are taken back proportionally from
  // segments already above the minimum, so the circle still sums to 360.
  const MIN_SWEEP_DEG = 28;
  const naturalSweep = visible.map((s) => (total > 0 ? (s.value / total) * 360 : 0));
  const shortfall = naturalSweep.reduce((sum, deg) => sum + Math.max(0, MIN_SWEEP_DEG - deg), 0);
  const donorPool = naturalSweep.reduce((sum, deg) => sum + (deg > MIN_SWEEP_DEG ? deg : 0), 0);
  const sweeps = naturalSweep.map((deg) => {
    if (deg <= 0) return 0;
    if (deg < MIN_SWEEP_DEG) return MIN_SWEEP_DEG;
    if (donorPool <= 0) return deg;
    return Math.max(0, deg - shortfall * (deg / donorPool));
  });

  let cursorDeg = -90;
  const arcs = visible.map((s, i) => {
    const sweepDeg = sweeps[i];
    const rawDash = (sweepDeg / 360) * c;
    const dash = Math.max(0, rawDash - gapPx);
    const rotate = cursorDeg;
    const midDeg = rotate + sweepDeg / 2;
    cursorDeg += sweepDeg;
    return {
      ...s,
      dash,
      rotate,
      percent: total > 0 ? Math.round((s.value / total) * 100) : 0,
      labelX: cx + labelR * Math.cos((midDeg * Math.PI) / 180),
      labelY: cy + labelR * Math.sin((midDeg * Math.PI) / 180),
    };
  });

  return (
    <div className={styles.ringWrap} style={{ width: canvas, height: canvas }}>
      <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} role="img" aria-label={ariaLabel}>
        {!isPie && <circle cx={cx} cy={cy} r={r} className={styles.ringTrack} strokeWidth={stroke} fill="none" />}
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={cx}
            cy={cy}
            r={r}
            strokeWidth={stroke}
            fill="none"
            stroke={arc.color}
            strokeDasharray={`${arc.dash} ${c - arc.dash}`}
            strokeLinecap={isPie ? 'butt' : 'round'}
            transform={`rotate(${arc.rotate} ${cx} ${cy})`}
          >
            <title>{`${arc.key}: ${arc.value}`}</title>
          </circle>
        ))}
        {showDataLabels &&
          arcs.map((arc) => (
            <text
              key={`${arc.key}-label`}
              x={arc.labelX}
              y={arc.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className={styles.ringDataLabel}
              style={{ fill: arc.labelColor ?? (isInside ? '#fff' : arc.color) }}
            >
              {arc.percent}%
            </text>
          ))}
      </svg>
      {!isPie && centerLabel && (
        <div className={styles.ringCenter}>
          <span className={styles.ringValueText}>{centerLabel}</span>
          {caption && <span className={styles.ringCaption}>{caption}</span>}
        </div>
      )}
    </div>
  );
}
