import type { SVGProps } from 'react';
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

function CompassIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.7 5.2a.6.6 0 0 1-.4.4l-5.2 1.7 1.7-5.2a.6.6 0 0 1 .4-.4z" />
    </svg>
  );
}

function LayersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </svg>
  );
}

function GraduationIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3 9 9-4.5L21 9l-9 4.5Z" />
      <path d="M7 11.3V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.7" />
      <path d="M21 9v6" />
    </svg>
  );
}

// Abstract SVG illustration of stacked building blocks representing a real
// project -- hand-built, no stock art (see apps/app CLAUDE.md).
function ProjectGraphic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 480 420" fill="none" role="img" aria-label="Abstract illustration of stacked building blocks representing a real project" {...props}>
      <defs>
        <linearGradient id="homeProjBlockA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6A1B9A" />
        </linearGradient>
        <linearGradient id="homeProjBlockB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357ABD" />
          <stop offset="100%" stopColor="#1E4D8C" />
        </linearGradient>
        <linearGradient id="homeProjBlockC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <radialGradient id="homeProjGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="240" cy="220" r="190" fill="url(#homeProjGlow)" />

      <g transform="translate(90 240) rotate(-4)">
        <rect width="150" height="46" rx="10" fill="url(#homeProjBlockB)" />
      </g>
      <g transform="translate(130 180) rotate(3)">
        <rect width="170" height="46" rx="10" fill="url(#homeProjBlockA)" />
      </g>
      <g transform="translate(105 120) rotate(-2)">
        <rect width="190" height="46" rx="10" fill="url(#homeProjBlockC)" />
      </g>

      <circle cx="360" cy="100" r="20" fill="#ffffff" stroke="#357ABD" strokeWidth="3" />
      <path d="M352 100h16M360 92v16" stroke="#357ABD" strokeWidth="3" strokeLinecap="round" />

      <circle cx="380" cy="260" r="28" fill="#ffffff" stroke="#0D9488" strokeWidth="3" />
      <path d="m368 260 7 7 15-16" stroke="#0D9488" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M330 320c-40 10-90 4-120-18" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
    </svg>
  );
}

export default function WhatYouBuildSection() {
  return (
    <StorySection
      eyebrow="What You Build"
      title="Real Projects, Not Just Exercises"
      description="Every course pairs its lessons with production-grade projects and interview-ready challenges — the kind of work that actually builds the skills employers look for."
      graphic={<ProjectGraphic />}
      tone="purple"
      reverse
      bullets={[
        { icon: <CompassIcon />, text: 'A consistent structure across every topic and course' },
        { icon: <LayersIcon />, text: 'System design, coding challenges, and full pipelines' },
        { icon: <GraduationIcon />, text: 'Practice and review built into every module' },
      ]}
    />
  );
}
