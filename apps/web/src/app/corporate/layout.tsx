import type { ReactNode } from 'react';

export const metadata = {
  title: 'Corporate Portal — Sypher',
};

// The corporate portal is served on corporate.sypher.local (middleware
// redirects that host into /corporate/*). The root layout's <Navbar />
// hides itself for this path prefix, so this layout only needs to pass
// children through — the pages own their full-viewport centred card.
export default function CorporateLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
