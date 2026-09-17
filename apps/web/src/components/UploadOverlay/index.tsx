'use client';

import { useSyncExternalStore } from 'react';
import { subscribeUploadStatus, getUploadCountSnapshot } from '@/data/uploadStatus';
import styles from './styles.module.css';

// Mounted once in the root layout. Any uploadToBunny() call anywhere in the
// app (blog/course/video/cohort editors, profile avatar, onboarding, etc.)
// increments the shared counter in data/uploadStatus.ts — this just renders
// whether that counter is above zero, so no call site needs its own loading
// state wired up.
export default function UploadOverlay(): React.JSX.Element | null {
  const uploading = useSyncExternalStore(subscribeUploadStatus, getUploadCountSnapshot, () => 0) > 0;

  if (!uploading) return null;

  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-label="Uploading">
      <div className={styles.spinner} />
    </div>
  );
}
