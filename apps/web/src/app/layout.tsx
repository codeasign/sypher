import type { ReactNode } from 'react';
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Sypher Next',
};

// Runs before paint (blocking <head> script, hoisted there by next/script's
// beforeInteractive strategy regardless of where it's declared in the
// tree) to set data-theme from the stored preference — same flash-of-
// wrong-theme fix Docusaurus and apps/app both ship. Without this the page
// would paint in light mode and then flip once React hydrates and
// useColorMode reads localStorage.
const SET_THEME_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('sypher-color-mode');
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="set-theme" strategy="beforeInteractive">
          {SET_THEME_SCRIPT}
        </Script>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
