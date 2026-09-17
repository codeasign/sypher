'use client';

import { useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import styles from './styles.module.css';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Shared between the /videos/[slug] detail page and the Browse Videos
// modal (user request 2026-09-16). Native <video controls> does have a
// "Playback speed" option, but it's buried in the "⋮" overflow menu —
// not visible without a click (user's own catch, 2026-09-16), so it's
// worth a small always-visible overlay: Material "speed" glyph + dark
// dropdown, pinned to the video's top-right corner (settled there after
// trying bottom-right-near-volume, which only ever approximated the
// native icons' position since that bar is rendered in the browser's own
// internal UI, not the page DOM). Top-right is the one spot guaranteed
// not to fight the native control bar, which owns the bottom edge on
// every browser.
//
// controlsList="nodownload" + a blocked context menu deter casual
// "Save video as…" — not real DRM, just removes the one-click paths.
//
// `slug`, not a direct URL: the real Bunny CDN URL is never sent to the
// client at all (user request 2026-09-16, "URL should not be exposed").
// This points at our own API's streaming-proxy route instead
// (lib/videoStream.ts server-side), which is session-cookie gated —
// there's nothing for a viewer to copy out of the DOM/DevTools that
// works outside their own signed-in browser.
export default function VideoPlayer({ slug }: { slug: string }): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  const src = `${API_BASE_URL}/videos/${encodeURIComponent(slug)}/stream`;

  function handleRateChange(next: number): void {
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  return (
    <div className={styles.playerWrap}>
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className={styles.video}
      />
      <label className={styles.rateOverlay}>
        {/* Material Symbols "speed" glyph (outlined variant's path) */}
        <svg viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="m555-317 106-106q17-17 17-42t-17-42q-17-17-42-17t-42 17L471-401q-8 8-13 18t-5 21q0 25 17 42t42 17q11 0 21-5t22-13ZM480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-800q65 0 122.5 22t102.5 61l55-55 57 57-55 55q39 45 61 102.5T845-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Zm0-80q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm0-280Z" />
        </svg>
        <select
          aria-label="Playback speed"
          className={styles.rateSelect}
          value={rate}
          onChange={(e) => handleRateChange(Number(e.target.value))}
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
