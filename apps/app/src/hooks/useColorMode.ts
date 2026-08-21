'use client';

import { useCallback, useEffect, useState } from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'sypher-color-mode';

// Every call site (Navbar's toggle, CodeBlock, the three MDXEditor
// components) mounts its own independent instance of this hook's useState --
// there's no shared context. Without this event, flipping the theme in one
// component (e.g. Navbar) updated the DOM attribute + localStorage but left
// every OTHER already-mounted instance's local state stale until a full
// remount (a page refresh), even though the toggle itself "worked" globally.
const COLOR_MODE_EVENT = 'sypher-color-mode-change';

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

    function handleColorModeChange(): void {
      setColorModeState(readStoredColorMode());
    }
    window.addEventListener(COLOR_MODE_EVENT, handleColorModeChange);
    return () => window.removeEventListener(COLOR_MODE_EVENT, handleColorModeChange);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(STORAGE_KEY, mode);
    setColorModeState(mode);
    window.dispatchEvent(new Event(COLOR_MODE_EVENT));
  }, []);

  return { colorMode, setColorMode };
}
