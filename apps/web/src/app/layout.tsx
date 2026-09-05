import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import FirstLoginOnboarding from '@/components/FirstLoginOnboarding';
import ThemeScript from '@/components/ThemeScript';
import './globals.css';

export const metadata = {
  title: 'Sypher Next',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <Navbar />
        {children}
        <FirstLoginOnboarding />
      </body>
    </html>
  );
}
