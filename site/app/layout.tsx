import type { Metadata } from 'next';
import { IBM_Plex_Mono, Syne } from 'next/font/google';
import './globals.css';

const display = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Not Like Us | Anti-default field manual',
  description: 'Rules that make AI work look less the same.',
  metadataBase: new URL('https://notlikeus.art'),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Not Like Us',
    description: 'An anti-default field manual for AI-assisted writing and design.',
    images: ['/not-like-us-banner.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Not Like Us',
    description: 'An anti-default field manual for AI-assisted writing and design.',
    images: ['/not-like-us-banner.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
