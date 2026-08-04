import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import AnalyticsBootstrap from "@/components/AnalyticsBootstrap";
import AnalyticsSession from "@/components/AnalyticsSession";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sypher — Learn AI Engineering & System Design",
    template: "%s | Sypher",
  },
  description:
    "Sypher is a hands-on learning platform for AI engineering, system design, Python, and software engineering. Text-first lessons with real projects.",
};

// Runs before paint (blocking <head> script) to set data-theme from the
// stored preference, same flash-of-wrong-theme fix Docusaurus ships --
// without this, the page would paint in light mode and then flip.
const SET_THEME_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('sypher-color-mode');
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* next/script hoists beforeInteractive scripts into <head> itself
            regardless of where in the tree they're declared -- body is the
            documented placement, not <head> directly. A raw <script> tag
            (previously used here) isn't guaranteed to execute outside the
            initial SSR document, which is what the "script tag while
            rendering" console warning was about. */}
        <Script id="set-theme" strategy="beforeInteractive">
          {SET_THEME_SCRIPT}
        </Script>
        <AnalyticsBootstrap />
        <AuthProvider>
          <AnalyticsSession />
          <Navbar />
          {children}
          <CookieConsentBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
