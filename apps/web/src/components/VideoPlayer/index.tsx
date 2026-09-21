'use client';

import { Gauge, Play } from 'lucide-react';
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
  const [paused, setPaused] = useState(true);
  const src = `${API_BASE_URL}/videos/${encodeURIComponent(slug)}/stream`;

  function handleRateChange(next: number): void {
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function handlePlayIconClick(): void {
    videoRef.current?.play();
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
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className={styles.video}
      />
      {paused && (
        <button
          type="button"
          aria-label="Play video"
          className={styles.centerPlayButton}
          onClick={handlePlayIconClick}
        >
          <Play size={28} fill="currentColor" />
        </button>
      )}
      <label className={styles.rateOverlay}>
        {/* Playback-speed glyph */}
        <Gauge size={16} />
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
