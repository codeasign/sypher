import type { SVGProps } from 'react';
import { Compass, GraduationCap, Layers, type LucideProps } from 'lucide-react';
import StorySection from '@/components/StorySection';


function CompassIcon(props: LucideProps) {
  return <Compass size={24} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

function LayersIcon(props: LucideProps) {
  return <Layers size={24} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

function GraduationIcon(props: LucideProps) {
  return <GraduationCap size={24} strokeWidth={1.8} aria-hidden="true" {...props} />;
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
