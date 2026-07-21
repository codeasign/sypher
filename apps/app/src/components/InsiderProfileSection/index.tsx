'use client';

import React, { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

function RabbitScene(): React.JSX.Element {
  return (
    <svg className={styles.sceneSvg} viewBox="0 0 140 110" aria-hidden="true">
      <ellipse className={styles.shadow} cx="70" cy="98" rx="34" ry="6" />

      <g className={styles.rabbitHopper}>
        <ellipse className={styles.rabbitLegBack} cx="46" cy="76" rx="9" ry="15" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <ellipse className={styles.rabbitLegFront} cx="92" cy="76" rx="8" ry="13" fill="#fff" stroke="#1c1e21" strokeWidth="2" />

        <ellipse cx="68" cy="58" rx="36" ry="25" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <circle cx="104" cy="56" r="8" fill="#fff" stroke="#1c1e21" strokeWidth="2" />

        <circle cx="38" cy="40" r="21" fill="#fff" stroke="#1c1e21" strokeWidth="2" />

        <g className={styles.rabbitEars}>
          <ellipse cx="27" cy="10" rx="6.5" ry="24" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
          <ellipse cx="45" cy="8" rx="6.5" ry="24" fill="#ffd6de" stroke="#1c1e21" strokeWidth="2" />
        </g>

        <circle cx="31" cy="38" r="2.6" fill="#1c1e21" />
        <circle cx="17" cy="45" r="2.2" fill="#ff8fa3" />
      </g>
    </svg>
  );
}

function DogCatScene(): React.JSX.Element {
  return (
    <svg className={styles.sceneSvg} viewBox="0 0 240 120" aria-hidden="true">
      <ellipse className={styles.shadow} cx="80" cy="104" rx="30" ry="5" />
      <ellipse className={styles.shadow} cx="205" cy="100" rx="22" ry="4" />

      <g className={styles.catRunner}>
        <path d="M198 46 L188 24 L196 50 Z" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
        <path d="M212 44 L222 22 L216 50 Z" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
        <circle cx="205" cy="54" r="16" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
        <ellipse cx="204" cy="82" rx="20" ry="16" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
        <path className={styles.catTail} d="M222 88 Q240 78 232 56" fill="none" stroke="#1c1e21" strokeWidth="4" strokeLinecap="round" />
        <circle cx="199" cy="52" r="2" fill="#1c1e21" />
        <ellipse className={styles.catLegA} cx="192" cy="98" rx="5" ry="10" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
        <ellipse className={styles.catLegB} cx="216" cy="98" rx="5" ry="10" fill="#ffb27a" stroke="#1c1e21" strokeWidth="2" />
      </g>

      <g className={styles.dogRunner}>
        <ellipse cx="55" cy="78" rx="28" ry="18" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <circle cx="94" cy="58" r="17" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <ellipse className={styles.dogEar} cx="88" cy="42" rx="7" ry="14" fill="#c98b5e" stroke="#1c1e21" strokeWidth="2" />
        <ellipse cx="108" cy="62" rx="9" ry="7" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <circle cx="113" cy="61" r="2.4" fill="#1c1e21" />
        <circle cx="90" cy="54" r="2.2" fill="#1c1e21" />
        <path className={styles.dogTail} d="M28 68 Q10 58 18 44" fill="none" stroke="#1c1e21" strokeWidth="4" strokeLinecap="round" />
        <ellipse className={styles.dogLegA} cx="40" cy="94" rx="6" ry="12" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
        <ellipse className={styles.dogLegB} cx="70" cy="94" rx="6" ry="12" fill="#fff" stroke="#1c1e21" strokeWidth="2" />
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
  { name: 'rabbit', Component: RabbitScene },
  { name: 'dog_cat', Component: DogCatScene },
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
