'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { uploadToBunny } from '@/data/bunnyUpload';
import { PRESET_AVATARS, checkHandleAvailable, submitOnboarding } from '@/data/onboarding';
import styles from './styles.module.css';

// Pre-auth / password screens where a blocking onboarding modal would be
// wrong. Everything else — main host AND corporate.sypher.local, every
// role — shows the modal until onboarding is done.
const SKIP_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/set-password'];
const SKIP_EXACT = ['/corporate', '/corporate/login'];

interface Me {
  username: string;
  onboardedAt: string | null;
  mustResetPassword: boolean;
}

// Legal doc links must resolve to the MAIN app even on the corporate host
// (middleware would rewrite a bare /terms-and-conditions into /corporate/…).
function legalHref(path: string): string {
  if (typeof window !== 'undefined' && window.location.host.startsWith('corporate.')) {
    return window.location.origin.replace('://corporate.', '://next.') + path;
  }
  return path;
}

export default function FirstLoginOnboarding(): React.JSX.Element | null {
  const pathname = usePathname() ?? '';
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);

  const skip =
    SKIP_EXACT.includes(pathname) || SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (!cancelled) {
          setMe(data);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [skip, pathname]);

  // Only render once we know: signed in, past the password step, not onboarded.
  if (skip || !checked || !me || me.mustResetPassword || me.onboardedAt) return null;

  return <OnboardingModal initialHandle={me.username} />;
}

function OnboardingModal({ initialHandle }: { initialHandle: string }): React.JSX.Element {
  const [handle, setHandle] = useState(initialHandle);
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [avatar, setAvatar] = useState<string>(PRESET_AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runHandleCheck = useCallback((value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setHandleState('invalid');
      return;
    }
    setHandleState('checking');
    checkHandleAvailable(normalized)
      .then((r) => setHandleState(r.valid ? (r.available ? 'ok' : 'taken') : 'invalid'))
      .catch(() => setHandleState('idle'));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runHandleCheck(handle), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handle, runHandleCheck]);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, 'users/avatars');
      setUploadedUrl(url);
      setAvatar(url);
    } catch {
      setError('Could not upload that image. Pick one of the presets instead.');
    } finally {
      setUploading(false);
    }
  }

  const canSubmit = handleState === 'ok' && !!avatar && agree && !submitting && !uploading;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await submitOnboarding({
      username: handle.trim().toLowerCase(),
      avatarUrl: avatar,
      acceptedLegal: agree,
    });
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error ?? 'Something went wrong.');
      if (result.error?.toLowerCase().includes('taken')) setHandleState('taken');
      return;
    }
    // Reload so the whole app (Navbar, etc.) re-reads the now-onboarded user.
    window.location.reload();
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className={styles.panel}>
        <h1 id="onb-title" className={styles.title}>Welcome to Sypher</h1>
        <p className={styles.subtitle}>A couple of quick things before you start.</p>

        <form onSubmit={handleSubmit}>
          {/* Handle */}
          <label className={styles.label} htmlFor="onb-handle">Your handle</label>
          <div className={styles.handleWrap}>
            <span className={styles.at}>@</span>
            <input
              id="onb-handle"
              className={styles.handleInput}
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
            />
          </div>
          <p className={styles.hint}>
            {handleState === 'checking' && 'Checking…'}
            {handleState === 'ok' && <span className={styles.hintOk}>@{handle.trim().toLowerCase()} is available</span>}
            {handleState === 'taken' && <span className={styles.hintBad}>That handle is taken</span>}
            {handleState === 'invalid' && 'Use 3–20 lowercase letters, numbers or underscores'}
            {handleState === 'idle' && 'This is how people @mention you'}
          </p>

          {/* Avatar */}
          <label className={styles.label}>Your avatar</label>
          <div className={styles.avatarGrid}>
            {PRESET_AVATARS.map((src) => (
              <button
                type="button"
                key={src}
                className={`${styles.avatarBtn} ${avatar === src ? styles.avatarBtnActive : ''}`}
                onClick={() => setAvatar(src)}
                aria-label="Choose this avatar"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={styles.avatarImg} />
              </button>
            ))}
            <button
              type="button"
              className={`${styles.avatarBtn} ${styles.uploadBtn} ${uploadedUrl && avatar === uploadedUrl ? styles.avatarBtnActive : ''}`}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploadedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadedUrl} alt="" className={styles.avatarImg} />
              ) : (
                <span className={styles.uploadLabel}>{uploading ? 'Uploading…' : 'Upload'}</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </div>

          {/* Legal */}
          <label className={styles.agreeRow}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I have read and agree to the{' '}
              <a href={legalHref('/terms-and-conditions')} target="_blank" rel="noopener noreferrer">Terms of Service</a>,{' '}
              <a href={legalHref('/privacy-policy')} target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
              <a href={legalHref('/refund-policy')} target="_blank" rel="noopener noreferrer">Refund Policy</a>.
            </span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {submitting ? 'Saving…' : 'Start learning'}
          </button>
        </form>
      </div>
    </div>
  );
}
