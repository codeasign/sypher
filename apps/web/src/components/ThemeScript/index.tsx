'use client';

import { useRef } from 'react';
import { useServerInsertedHTML } from 'next/navigation';

// Runs before paint (injected straight into <head> during the SSR stream)
// to set data-theme from the stored preference — same flash-of-wrong-theme
// fix Docusaurus and apps/app both ship. Without this the page would paint
// in light mode and then flip once React hydrates and useColorMode reads
// localStorage.
const SET_THEME_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('sypher-color-mode');
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;

// Deliberately NOT next/script's <Script strategy="beforeInteractive">
// (2026-09-05): that component's own implementation renders a <script>
// host element as part of the normal client-hydrated tree, which trips
// React 19's "Encountered a script tag while rendering React component"
// warning on Next.js 16.2+ — a known false positive hit by next-themes,
// HeroUI, and shadcn-ui alike (the script runs correctly; only the dev
// console warning is spurious, and it also spams the terminal via 16.2's
// browserToTerminal). useServerInsertedHTML instead injects the raw
// <script> string straight into the SSR HTML stream's <head> — it never
// becomes part of the client-hydrated component tree, so React's
// script-host warning path never sees it. Same "runs before paint" outcome
// as beforeInteractive; this component itself renders nothing.
//
// useServerInsertedHTML's callback re-fires on every SSR stream flush (one
// per Suspense boundary that resolves) — without the inserted guard this
// re-injected the tag once per flush (11 duplicate <script id="set-theme">
// tags scattered through <body> on a page with several boundaries, caught
// 2026-09-05). Same one-shot-ref pattern Next's own docs use for CSS-in-JS
// libraries: inject on the first flush only, no-op on every flush after.
export default function ThemeScript(): null {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script id="set-theme" dangerouslySetInnerHTML={{ __html: SET_THEME_SCRIPT }} />;
  });
  return null;
}
