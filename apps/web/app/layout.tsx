import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

// Body — Inter with full weight range
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Display — Inter at the weights we actually use for editorial headlines
const interDisplay = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.airesearchlab.space'),
  title: 'AI Research Lab',
  description: '502 arxiv papers, read for you. Five specialized agents surface contradictions, consensus, and frontiers across nine AI subfields. Free, open source.',
  openGraph: {
    title: 'AI Research Lab — 502 arxiv papers, read for you',
    description: '502 arxiv papers, read for you. Five specialized agents surface contradictions, consensus, and frontiers across nine AI subfields. Free, open source.',
    url: 'https://www.airesearchlab.space',
    type: 'website',
    siteName: 'AI Research Lab',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Research Lab — 502 papers, read for you. Five agents tell you what matters.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Research Lab — 502 arxiv papers, read for you',
    description: '502 arxiv papers, read for you. Five specialized agents surface contradictions, consensus, and frontiers.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, interDisplay.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
