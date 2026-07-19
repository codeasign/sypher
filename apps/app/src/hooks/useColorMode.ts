'use client';

import { useCallback, useEffect, useState } from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'sypher-color-mode';

function readStoredColorMode(): ColorMode {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// Mirrors Docusaurus's @docusaurus/theme-common useColorMode (2-state --
// apps/app has no OS-preference/system-mode layer yet, unlike docs' 3-state
// toggle). data-theme is applied synchronously pre-paint by the inline
// script in layout.tsx, but the SSR-rendered HTML always assumes 'light'
// (the server can't see localStorage) -- so the initial state here must
// also be 'light' to match the server render exactly, or React logs a
// hydration mismatch on the toggle button's icon/aria-label. useEffect runs
// post-hydration, so correcting the state there is safe.
export function useColorMode(): { colorMode: ColorMode; setColorMode: (mode: ColorMode) => void } {
  const [colorMode, setColorModeState] = useState<ColorMode>('light');

  useEffect(() => {
    setColorModeState(readStoredColorMode());
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(STORAGE_KEY, mode);
    setColorModeState(mode);
  }, []);

  return { colorMode, setColorMode };
}
