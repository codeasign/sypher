import type { SVGProps } from 'react';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import StorySection from '@/components/StorySection';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...props,
  };
}

function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M20 5.5c0-.83-.67-1.5-1.5-1.5H12v16h6.5c.83 0 1.5-.67 1.5-1.5z" />
      <path d="M12 4v16" />
    </svg>
  );
}

function CodeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 8 5 12l4 4" />
      <path d="M15 8l4 4-4 4" />
    </svg>
  );
}

function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Abstract SVG illustration of an open book with floating concept bubbles --
// hand-built, no stock art (see apps/app CLAUDE.md: no icon library installed).
function LearnGraphic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 480 420" fill="none" role="img" aria-label="Abstract illustration of an open book with floating concept bubbles" {...props}>
      <defs>
        <linearGradient id="homeLearnBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357ABD" />
          <stop offset="100%" stopColor="#1E4D8C" />
        </linearGradient>
        <radialGradient id="homeLearnGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#357ABD" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#357ABD" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="240" cy="220" r="190" fill="url(#homeLearnGlow)" />

      <g transform="translate(120 150)">
        <path d="M120 0C90 0 60 8 40 20V190c20-12 50-20 80-20s60 8 80 20V20C180 8 150 0 120 0Z" fill="url(#homeLearnBook)" />
        <path d="M120 0v190" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" />
        <path d="M58 40h48M58 62h48M58 84h36" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="6" strokeLinecap="round" />
        <path d="M142 40h48M142 62h48M142 84h36" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />
      </g>

      <circle cx="90" cy="110" r="22" fill="#ffffff" stroke="#7C3AED" strokeWidth="3" />
      <path d="m82 110 5 5 11-11" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="380" cy="150" r="18" fill="#ffffff" stroke="#0D9488" strokeWidth="3" />
      <circle cx="380" cy="150" r="5" fill="#0D9488" />

      <circle cx="360" cy="300" r="26" fill="#ffffff" stroke="#357ABD" strokeWidth="3" />
      <path d="M348 300h24M360 288v24" stroke="#357ABD" strokeWidth="3" strokeLinecap="round" />

      <path d="M100 320c40 20 100 20 150-10" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
    </svg>
  );
}

const DOCS_ORIGIN = getDocsOrigin();

export default function HowYouLearnSection() {
  return (
    <StorySection
      eyebrow="How You Learn"
      title="Text-First, Deep Learning"
      description="No passive videos to half-watch. Every concept is explained in clear, annotated text with real code — the way engineers actually learn best. You read, you code, you build."
      graphic={<LearnGraphic />}
      tone="blue"
      bullets={[
        { icon: <BookIcon />, text: 'Clear, annotated lessons — never unexplained code' },
        { icon: <CodeIcon />, text: 'Deep dives into LLMs, agents, MCP, and RAG' },
        { icon: <TargetIcon />, text: 'Built for how modern AI systems are actually shipped' },
      ]}
      cta={{ label: 'Browse the curriculum', href: `${DOCS_ORIGIN}/courses` }}
    />
  );
}
