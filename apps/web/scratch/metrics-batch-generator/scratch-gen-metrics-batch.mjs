// Batch generator for the Developer + QA/QE metrics-course wave.
// Builds staging .mdx + chart SVGs per course, uploads charts to Bunny,
// links URLs into bodies, then shells out to import-authored-course.mjs.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd(); // run from apps/web
const API = 'http://localhost:4000';

// Loads apps/web/.env into process.env (Node 20.6+ built-in — this is a
// plain `node` script, not `next dev`, so nothing loads .env for it
// automatically). Never hardcode the Bunny credentials here — see
// apps/web/.env.example for the four expected BUNNY_* names (server-only,
// no NEXT_PUBLIC_ prefix — the storage key must never reach a client bundle).
process.loadEnvFile(path.join(ROOT, '.env'));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in apps/web/.env — see .env.example`);
  return value;
}

const BUNNY = {
  zone: requireEnv('BUNNY_STORAGE_ZONE'),
  accessKey: requireEnv('BUNNY_STORAGE_ACCESS_KEY'),
  hostname: requireEnv('BUNNY_STORAGE_HOSTNAME'),
  pullZoneUrl: requireEnv('BUNNY_PULL_ZONE_URL'),
};

// ---------- small utils ----------
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const pct = (part, whole) => round1((part / whole) * 100);

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

// ---------- SVG chart engine ----------
const COLORS = {
  primary: '#4f46e5',
  secondary: '#0ea5e9',
  tertiary: '#f59e0b',
  quaternary: '#ef4444',
  grid: '#e2e8f0',
  ink: '#1e293b',
  muted: '#64748b',
  bg: '#ffffff',
};
const PALETTE = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary, '#10b981', '#a855f7'];

function svgWrap(title, width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${COLORS.bg}"/>
<text x="20" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${COLORS.ink}">${escXml(title)}</text>
${body}
</svg>`;
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lineChart({ title, xLabels, series, yLabel, width = 640, height = 380 }) {
  const padL = 55, padR = 24, padT = 55, padB = 55;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const allValues = series.flatMap((s) => s.values);
  const yMax = Math.max(...allValues) * 1.15;
  const yMin = Math.min(0, Math.min(...allValues));
  const xStep = plotW / (xLabels.length - 1 || 1);
  const yScale = (v) => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const xScale = (i) => padL + i * xStep;

  let grid = '';
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const v = yMin + ((yMax - yMin) * i) / gridLines;
    const y = yScale(v);
    grid += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="end">${round1(v)}</text>`;
  }
  let xLabelsSvg = '';
  xLabels.forEach((l, i) => {
    if (xLabels.length > 10 && i % 2 !== 0 && i !== xLabels.length - 1) return;
    xLabelsSvg += `<text x="${xScale(i)}" y="${height - padB + 20}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.muted}" text-anchor="middle">${escXml(l)}</text>`;
  });

  let lines = '';
  series.forEach((s, si) => {
    const color = s.color || PALETTE[si % PALETTE.length];
    const pts = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
    lines += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    s.values.forEach((v, i) => {
      lines += `<circle cx="${xScale(i)}" cy="${yScale(v)}" r="3.5" fill="${color}"/>`;
    });
  });

  let legend = '';
  if (series.length > 1) {
    series.forEach((s, si) => {
      const color = s.color || PALETTE[si % PALETTE.length];
      const lx = padL + si * 150;
      legend += `<rect x="${lx}" y="${padT - 22}" width="10" height="10" fill="${color}"/>`;
      legend += `<text x="${lx + 15}" y="${padT - 13}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.ink}">${escXml(s.name)}</text>`;
    });
  }

  const yLabelSvg = yLabel
    ? `<text x="16" y="${padT + plotH / 2}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="middle" transform="rotate(-90 16 ${padT + plotH / 2})">${escXml(yLabel)}</text>`
    : '';

  return svgWrap(title, width, height, `${grid}${lines}${xLabelsSvg}${legend}${yLabelSvg}<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="${COLORS.ink}" stroke-width="1.5"/>`);
}

function barChart({ title, categories, values, color = COLORS.primary, yLabel, width = 640, height = 380, valueSuffix = '' }) {
  const padL = 55, padR = 24, padT = 40, padB = 70;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const yMax = Math.max(...values) * 1.2;
  const barW = (plotW / categories.length) * 0.6;
  const gap = (plotW / categories.length) * 0.4;
  const yScale = (v) => (v / yMax) * plotH;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const y = padT + plotH - yScale(v);
    grid += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="end">${round1(v)}</text>`;
  }

  let bars = '';
  categories.forEach((c, i) => {
    const x = padL + i * (plotW / categories.length) + gap / 2;
    const h = yScale(values[i]);
    const y = padT + plotH - h;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3"/>`;
    bars += `<text x="${x + barW / 2}" y="${y - 6}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${COLORS.ink}" text-anchor="middle">${values[i]}${valueSuffix}</text>`;
    bars += `<text x="${x + barW / 2}" y="${padT + plotH + 18}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.muted}" text-anchor="middle">${escXml(c)}</text>`;
  });

  const yLabelSvg = yLabel
    ? `<text x="16" y="${padT + plotH / 2}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="middle" transform="rotate(-90 16 ${padT + plotH / 2})">${escXml(yLabel)}</text>`
    : '';

  return svgWrap(title, width, height, `${grid}${bars}${yLabelSvg}<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="${COLORS.ink}" stroke-width="1.5"/>`);
}

function stackedBarChart({ title, categories, series, width = 640, height = 400 }) {
  const padL = 55, padR = 24, padT = 55, padB = 60;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const totals = categories.map((_, i) => sum(series.map((s) => s.values[i])));
  const yMax = Math.max(...totals) * 1.1;
  const barW = (plotW / categories.length) * 0.55;
  const yScale = (v) => (v / yMax) * plotH;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const y = padT + plotH - yScale(v);
    grid += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="end">${round1(v)}</text>`;
  }

  let bars = '';
  categories.forEach((c, i) => {
    const x = padL + i * (plotW / categories.length) + ((plotW / categories.length) - barW) / 2;
    let yCursor = padT + plotH;
    series.forEach((s, si) => {
      const h = yScale(s.values[i]);
      yCursor -= h;
      bars += `<rect x="${x}" y="${yCursor}" width="${barW}" height="${h}" fill="${s.color || PALETTE[si % PALETTE.length]}"/>`;
    });
    bars += `<text x="${x + barW / 2}" y="${padT + plotH + 18}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.muted}" text-anchor="middle">${escXml(c)}</text>`;
  });

  let legend = '';
  series.forEach((s, si) => {
    const lx = padL + si * 130;
    legend += `<rect x="${lx}" y="${padT - 24}" width="10" height="10" fill="${s.color || PALETTE[si % PALETTE.length]}"/>`;
    legend += `<text x="${lx + 15}" y="${padT - 15}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.ink}">${escXml(s.name)}</text>`;
  });

  return svgWrap(title, width, height, `${grid}${bars}${legend}<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="${COLORS.ink}" stroke-width="1.5"/>`);
}

function donutChart({ title, segments, width = 520, height = 380 }) {
  const cx = 190, cy = 200, rOuter = 120, rInner = 65;
  const total = sum(segments.map((s) => s.value));
  let angle = -Math.PI / 2;
  let arcs = '';
  segments.forEach((s, i) => {
    const frac = s.value / total;
    const nextAngle = angle + frac * Math.PI * 2;
    const x1 = cx + rOuter * Math.cos(angle), y1 = cy + rOuter * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(nextAngle), y2 = cy + rOuter * Math.sin(nextAngle);
    const x3 = cx + rInner * Math.cos(nextAngle), y3 = cy + rInner * Math.sin(nextAngle);
    const x4 = cx + rInner * Math.cos(angle), y4 = cy + rInner * Math.sin(angle);
    const large = frac > 0.5 ? 1 : 0;
    const color = s.color || PALETTE[i % PALETTE.length];
    arcs += `<path d="M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z" fill="${color}"/>`;
    angle = nextAngle;
  });

  let legend = '';
  segments.forEach((s, i) => {
    const ly = 60 + i * 26;
    const color = s.color || PALETTE[i % PALETTE.length];
    legend += `<rect x="360" y="${ly}" width="12" height="12" fill="${color}"/>`;
    legend += `<text x="378" y="${ly + 11}" font-family="Arial, sans-serif" font-size="12" fill="${COLORS.ink}">${escXml(s.name)} (${pct(s.value, total)}%)</text>`;
  });

  return svgWrap(title, width, height, `${arcs}${legend}`);
}

function histogram({ title, buckets, color = COLORS.secondary, yLabel, width = 640, height = 380 }) {
  const padL = 55, padR = 24, padT = 40, padB = 70;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const values = buckets.map((b) => b.count);
  const yMax = Math.max(...values) * 1.2;
  const barW = (plotW / buckets.length) * 0.92;
  const yScale = (v) => (v / yMax) * plotH;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const y = padT + plotH - yScale(v);
    grid += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y + 4}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="end">${round1(v)}</text>`;
  }

  let bars = '';
  buckets.forEach((b, i) => {
    const x = padL + i * (plotW / buckets.length) + ((plotW / buckets.length) - barW) / 2;
    const h = yScale(b.count);
    const y = padT + plotH - h;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="2"/>`;
    bars += `<text x="${x + barW / 2}" y="${y - 6}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${COLORS.ink}" text-anchor="middle">${b.count}</text>`;
    bars += `<text x="${x + barW / 2}" y="${padT + plotH + 18}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.muted}" text-anchor="middle">${escXml(b.label)}</text>`;
  });

  const yLabelSvg = yLabel
    ? `<text x="16" y="${padT + plotH / 2}" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.muted}" text-anchor="middle" transform="rotate(-90 16 ${padT + plotH / 2})">${escXml(yLabel)}</text>`
    : '';

  return svgWrap(title, width, height, `${grid}${bars}${yLabelSvg}<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="${COLORS.ink}" stroke-width="1.5"/>`);
}

const chartBuilders = { line: lineChart, bar: barChart, stackedBar: stackedBarChart, donut: donutChart, histogram };

console.log('[gen] chart engine ready');
export { mdTable, round1, round2, avg, sum, pct, chartBuilders, BUNNY, API, ROOT, execFileSync, fs, path };
