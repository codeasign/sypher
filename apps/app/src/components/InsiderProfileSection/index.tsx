'use client';

import React, { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

// Flat-vector scene in the same whimsical house style as the other three
// (this component's only rendering option -- there's no image-generation
// tool wired into this codebase, so "cinematic" here means a little animated
// icon, not a photoreal render).
function CowboyScene(): React.JSX.Element {
  return (
    <svg className={styles.sceneSvg} viewBox="0 0 200 120" aria-hidden="true">
      <ellipse className={styles.shadow} cx="52" cy="108" rx="22" ry="5" />
      <ellipse className={styles.shadow} cx="155" cy="108" rx="20" ry="5" />

      <g className={styles.cowboyRecoil}>
        <ellipse cx="46" cy="100" rx="7" ry="11" fill="#3b2412" stroke="#1c1e21" strokeWidth="2" />
        <ellipse cx="60" cy="100" rx="7" ry="11" fill="#3b2412" stroke="#1c1e21" strokeWidth="2" />

        <rect x="38" y="56" width="28" height="36" rx="8" fill="#8a5a34" stroke="#1c1e21" strokeWidth="2" />

        <circle cx="52" cy="46" r="12" fill="#e8b98a" stroke="#1c1e21" strokeWidth="2" />
        <ellipse cx="52" cy="38" rx="22" ry="6" fill="#3b2412" stroke="#1c1e21" strokeWidth="2" />
        <path d="M40 38 Q52 20 64 38 Z" fill="#3b2412" stroke="#1c1e21" strokeWidth="2" />

        <rect x="63" y="56" width="34" height="9" rx="4.5" fill="#e8b98a" stroke="#1c1e21" strokeWidth="2" />
        <rect x="93" y="52" width="16" height="8" rx="2" fill="#1c1e21" />

        <g className={styles.muzzleFlash}>
          <path d="M109 56 L120 50 L116 56 L122 56 L109 62 L114 57 Z" fill="#ffcf4d" />
        </g>
      </g>

      <g className={styles.zombieStagger}>
        <ellipse cx="148" cy="100" rx="7" ry="11" fill="#6b7d5e" stroke="#1c1e21" strokeWidth="2" />
        <ellipse cx="162" cy="98" rx="7" ry="11" fill="#6b7d5e" stroke="#1c1e21" strokeWidth="2" />

        <ellipse cx="155" cy="76" rx="17" ry="22" fill="#8ba57d" stroke="#1c1e21" strokeWidth="2" />
        <path d="M141 66 L131 40 L139 68 Z" fill="#8ba57d" stroke="#1c1e21" strokeWidth="2" />
        <path d="M170 64 L182 38 L173 66 Z" fill="#8ba57d" stroke="#1c1e21" strokeWidth="2" />

        <circle cx="155" cy="46" r="13" fill="#9db98f" stroke="#1c1e21" strokeWidth="2" />
        <path d="M145 38 L149 30 L152 38 Z" fill="#5f7355" />
        <path d="M154 36 L157 27 L160 37 Z" fill="#5f7355" />
        <path d="M163 38 L167 30 L169 39 Z" fill="#5f7355" />
        <path d="M148 44 L152 48 M152 44 L148 48" stroke="#1c1e21" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M158 44 L162 48 M162 44 L158 48" stroke="#1c1e21" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M150 54 Q155 50 160 54" fill="none" stroke="#1c1e21" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <g className={styles.impactSpark}>
        <path d="M136 62 L142 58 L140 63 L145 63 L136 69 L139 64 Z" fill="#fff6d6" stroke="#1c1e21" strokeWidth="1" />
      </g>
    </svg>
  );
}

function TardisScene(): React.JSX.Element {
  const stars = [
    { cx: 16, cy: 18, r: 1.5, delay: '0s' },
    { cx: 55, cy: 100, r: 1.3, delay: '0.35s' },
    { cx: 170, cy: 20, r: 1.6, delay: '0.6s' },
    { cx: 190, cy: 70, r: 1.2, delay: '0.9s' },
    { cx: 150, cy: 118, r: 1.3, delay: '0.5s' },
    { cx: 25, cy: 65, r: 1.2, delay: '1.1s' },
  ];

  return (
    <svg className={styles.sceneSvg} viewBox="0 0 200 140" aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          className={styles.star}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="#fff"
          style={{ animationDelay: s.delay }}
        />
      ))}

      <g className={styles.tardisTumble}>
        <path
          className={styles.tardisTrail}
          d="M62 132 L82 108"
          stroke="#a9c8ff"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ animationDelay: '0s' }}
        />
        <path
          className={styles.tardisTrail}
          d="M72 136 L90 116"
          stroke="#a9c8ff"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ animationDelay: '0.2s' }}
        />

        <rect x="80" y="118" width="40" height="6" rx="2" fill="#12314a" stroke="#0d2333" strokeWidth="1" />
        <rect x="82" y="60" width="36" height="58" rx="2" fill="#1e6091" stroke="#12314a" strokeWidth="2" />
        <line x1="100" y1="62" x2="100" y2="116" stroke="#12314a" strokeWidth="2" />
        <line x1="82" y1="90" x2="118" y2="90" stroke="#12314a" strokeWidth="1.5" />

        <rect x="87" y="66" width="8" height="8" fill="#bfe4ff" stroke="#12314a" strokeWidth="1.5" />
        <rect x="105" y="66" width="8" height="8" fill="#bfe4ff" stroke="#12314a" strokeWidth="1.5" />
        <rect x="87" y="78" width="8" height="8" fill="#bfe4ff" stroke="#12314a" strokeWidth="1.5" />
        <rect x="105" y="78" width="8" height="8" fill="#bfe4ff" stroke="#12314a" strokeWidth="1.5" />

        <rect x="80" y="52" width="40" height="8" rx="1" fill="#12314a" stroke="#0d2333" strokeWidth="1" />
        <path d="M78 52 L122 52 L116 44 L84 44 Z" fill="#123a55" stroke="#12314a" strokeWidth="2" />

        <rect className={styles.lampBlink} x="96" y="36" width="8" height="8" rx="2" fill="#fff6d6" stroke="#12314a" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function SpaceScene(): React.JSX.Element {
  const stars = [
    { cx: 18, cy: 20, r: 1.6, delay: '0s' },
    { cx: 60, cy: 12, r: 1.2, delay: '0.3s' },
    { cx: 150, cy: 18, r: 1.5, delay: '0.6s' },
    { cx: 200, cy: 30, r: 1.2, delay: '0.9s' },
    { cx: 30, cy: 90, r: 1.3, delay: '0.4s' },
    { cx: 220, cy: 100, r: 1.6, delay: '0.7s' },
    { cx: 110, cy: 130, r: 1.2, delay: '1s' },
  ];

  return (
    <svg className={styles.sceneSvg} viewBox="0 0 240 150" aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          className={styles.star}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="#fff"
          style={{ animationDelay: s.delay }}
        />
      ))}

      <circle cx="46" cy="46" r="22" fill="#a9c8ff" stroke="#1c1e21" strokeWidth="2" />
      <ellipse cx="46" cy="46" rx="34" ry="7" fill="none" stroke="#1c1e21" strokeWidth="2" transform="rotate(-18 46 46)" />

      <circle cx="196" cy="118" r="15" fill="#ffcf8a" stroke="#1c1e21" strokeWidth="2" />

      <g className={styles.ship}>
        <path d="M120 40 Q132 15 144 40 L144 80 Q132 92 120 80 Z" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <circle cx="132" cy="46" r="7" fill="#a9c8ff" stroke="#1c1e21" strokeWidth="2" />
        <path d="M120 62 L106 74 L120 74 Z" fill="#ff9f6b" stroke="#1c1e21" strokeWidth="2" />
        <path d="M144 62 L158 74 L144 74 Z" fill="#ff9f6b" stroke="#1c1e21" strokeWidth="2" />
        <path className={styles.flame} d="M124 80 Q132 100 140 80 Z" fill="#ffb347" />
      </g>
    </svg>
  );
}

function NestScene(): React.JSX.Element {
  return (
    <svg className={styles.sceneSvg} viewBox="0 0 200 140" aria-hidden="true">
      <path d="M0 96 Q100 78 200 100" fill="none" stroke="#a9784f" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M52 96 Q60 74 100 74 Q140 74 148 96 Q100 108 52 96 Z"
        fill="#c99a63"
        stroke="#1c1e21"
        strokeWidth="2"
      />

      <g className={styles.birdA}>
        <circle cx="76" cy="66" r="13" fill="#ffd6de" stroke="#1c1e21" strokeWidth="2" />
        <path d="M68 68 L58 64 L68 74 Z" fill="#ffb347" stroke="#1c1e21" strokeWidth="1.5" />
        <circle cx="72" cy="62" r="1.8" fill="#1c1e21" />
      </g>

      <g className={styles.birdB}>
        <circle cx="100" cy="60" r="15" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <path d="M91 62 L79 57 L91 69 Z" fill="#ffb347" stroke="#1c1e21" strokeWidth="1.5" />
        <circle cx="96" cy="55" r="2" fill="#1c1e21" />
      </g>

      <g className={styles.birdC}>
        <circle cx="126" cy="67" r="12" fill="#cdeaff" stroke="#1c1e21" strokeWidth="2" />
        <path d="M119 69 L110 65 L119 75 Z" fill="#ffb347" stroke="#1c1e21" strokeWidth="1.5" />
        <circle cx="123" cy="63" r="1.7" fill="#1c1e21" />
      </g>
    </svg>
  );
}

const SCENES: { name: string; Component: () => React.JSX.Element }[] = [
  { name: 'cowboy', Component: CowboyScene },
  { name: 'tardis', Component: TardisScene },
  { name: 'space', Component: SpaceScene },
  { name: 'nest', Component: NestScene },
];

interface InsiderProfileSectionProps {
  heading?: string;
  message?: string;
}

// Little easter egg for the people who actually run the place (admin,
// internal HR) -- they don't have a candidate profile to fill out, so
// instead of the generic empty state, a wink that acknowledges they're
// staff, not a user of the platform. This only ever mounts client-side
// (ProfilePage gates on useAuth().loading first, which is always true
// during SSR), so picking the scene in initial state is safe -- there's no
// server-rendered version of this component to mismatch against.
export default function InsiderProfileSection({
  heading = 'One of Us…',
  message = "No candidate profile here — you run the place. Carry on.",
}: InsiderProfileSectionProps): React.JSX.Element {
  const [scene] = useState(() => SCENES[Math.floor(Math.random() * SCENES.length)]);

  useEffect(() => {
    trackEvent('insider_profile_view', { scene: scene.name });
  }, [scene.name]);

  return (
    <div className={styles.container}>
      <div className={styles.sceneWrap}>
        <scene.Component />
      </div>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
