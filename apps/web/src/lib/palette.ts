// Small shared accent palette so the dashboard (and anything else that
// wants it) can be colourful without hand-picking hex values everywhere.
// All helpers are pure + deterministic — safe to call during SSR and on
// the client without a hydration mismatch.

export const ACCENTS = [
  '#6c5ce7', // violet
  '#0ea5a4', // teal
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
] as const;

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable palette colour for an arbitrary key (course slug, etc.). */
export function accentFor(key: string): string {
  return ACCENTS[hashString(key) % ACCENTS.length];
}

/** Stable 135deg two-stop gradient for a key — used for generated covers. */
export function gradientFor(key: string): string {
  const h = hashString(key);
  const a = ACCENTS[h % ACCENTS.length];
  let b = ACCENTS[(h >> 3) % ACCENTS.length];
  if (b === a) b = ACCENTS[(h + 3) % ACCENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

// Fixed colours for the known course categories so they read consistently
// across the app; anything else falls back to the hash.
const CATEGORY_ACCENT: Record<string, string> = {
  tech: '#3b82f6',
  'life-skills': '#22c55e',
  Presentation: '#f59e0b',
  other: '#a855f7',
};

export function categoryAccent(key: string): string {
  return CATEGORY_ACCENT[key] ?? accentFor(key);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
