import type { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';
import Navbar from '@/components/Navbar';
import FirstLoginOnboarding from '@/components/FirstLoginOnboarding';
import ThemeScript from '@/components/ThemeScript';
import UploadOverlay from '@/components/UploadOverlay';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import './globals.css';

// Wordmark font for the navbar brand (exposed as --font-brand).
const brandFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-brand', display: 'swap' });

export const metadata = {
  title: 'Sypher Next',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en" className={brandFont.variable} suppressHydrationWarning>
      <body>
        <ThemeScript />
        <ToastProvider>
          <Navbar />
          {children}
          <FirstLoginOnboarding />
          <UploadOverlay />
        </ToastProvider>
      </body>
    </html>
  );
}
