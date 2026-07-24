import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { AuthGateProvider } from '@/components/auth-gate/AuthGateProvider';

/**
 * Two families, deliberately paired: a high-contrast display serif for titles
 * (the voice of a wall label) against a neutral grotesque for everything else.
 */
const displaySerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const bodySans = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ArtSpace Gallery',
  description: 'A subscription platform for artists to showcase and sell their work.',
};

// viewportFit: cover lets the room fill edge-to-edge behind notches; the panel
// then reclaims the safe-area inset it needs via env(safe-area-inset-*).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f4ee',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displaySerif.variable} ${bodySans.variable} font-sans antialiased`}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sm focus:text-stone-50"
        >
          Skip to content
        </a>
        <AuthGateProvider>
          <SiteHeader />
          <div id="content">{children}</div>
          <SiteFooter />
        </AuthGateProvider>
      </body>
    </html>
  );
}
