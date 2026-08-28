// Generates the 10 preset onboarding avatars into public/avatars/.
//   node scripts/gen-avatars.mjs   (from apps/web)
// Each is a 256x256 SVG: a diagonal two-stop gradient + one simple white
// motif at ~55% opacity. Deterministic — safe to re-run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatars');
mkdirSync(outDir, { recursive: true });

// [from, to] gradient stops + a motif key.
const AVATARS = [
  { id: '01', a: '#7c3aed', b: '#4f46e5', motif: 'circle' },
  { id: '02', a: '#ec4899', b: '#f43f5e', motif: 'triangle' },
  { id: '03', a: '#f59e0b', b: '#ea580c', motif: 'diamond' },
  { id: '04', a: '#10b981', b: '#0d9488', motif: 'hexagon' },
  { id: '05', a: '#0ea5e9', b: '#2563eb', motif: 'star' },
  { id: '06', a: '#d946ef', b: '#9333ea', motif: 'plus' },
  { id: '07', a: '#84cc16', b: '#16a34a', motif: 'drop' },
  { id: '08', a: '#ef4444', b: '#db2777', motif: 'ring' },
  { id: '09', a: '#06b6d4', b: '#3b82f6', motif: 'chevrons' },
  { id: '10', a: '#64748b', b: '#334155', motif: 'dots' },
];

const W = 256;
const C = W / 2;
const FILL = 'rgba(255,255,255,0.55)';

function motifSvg(key) {
  switch (key) {
    case 'circle':
      return `<circle cx="${C}" cy="${C}" r="58" fill="${FILL}"/>`;
    case 'triangle':
      return `<path d="M128 66 L190 178 L66 178 Z" fill="${FILL}"/>`;
    case 'diamond':
      return `<rect x="86" y="86" width="84" height="84" rx="10" transform="rotate(45 128 128)" fill="${FILL}"/>`;
    case 'hexagon':
      return `<path d="M128 62 L184 95 L184 161 L128 194 L72 161 L72 95 Z" fill="${FILL}"/>`;
    case 'star':
      return `<path d="M128 60 L146 112 L200 112 L156 145 L173 198 L128 165 L83 198 L100 145 L56 112 L110 112 Z" fill="${FILL}"/>`;
    case 'plus':
      return `<path d="M108 64 h40 v44 h44 v40 h-44 v44 h-40 v-44 h-44 v-40 h44 Z" fill="${FILL}"/>`;
    case 'drop':
      return `<path d="M128 60 C170 112 176 140 176 156 a48 48 0 0 1 -96 0 C80 140 86 112 128 60 Z" fill="${FILL}"/>`;
    case 'ring':
      return `<path d="M128 66 a62 62 0 1 0 0.1 0 Z M128 100 a28 28 0 1 1 -0.1 0 Z" fill="${FILL}" fill-rule="evenodd"/>`;
    case 'chevrons':
      return `<g fill="${FILL}"><path d="M84 92 l40 36 l-40 36 l-18 -16 l22 -20 l-22 -20 Z"/><path d="M140 92 l40 36 l-40 36 l-18 -16 l22 -20 l-22 -20 Z"/></g>`;
    case 'dots':
      return `<g fill="${FILL}">${[0, 1, 2]
        .flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${92 + c * 36}" cy="${92 + r * 36}" r="14"/>`))
        .join('')}</g>`;
    default:
      return '';
  }
}

for (const av of AVATARS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="Avatar ${av.id}">
  <defs><linearGradient id="g${av.id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${av.a}"/><stop offset="1" stop-color="${av.b}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${W}" fill="url(#g${av.id})"/>
  ${motifSvg(av.motif)}
</svg>
`;
  const file = join(outDir, `avatar-${av.id}.svg`);
  writeFileSync(file, svg);
  console.log('wrote', file);
}
console.log(`\n${AVATARS.length} avatars in public/avatars/`);
