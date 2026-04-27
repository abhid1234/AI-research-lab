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
  description: 'Five Claude agents arguing about AI papers, in public. 502 papers, 9 topics, fully transparent methodology.',
  openGraph: {
    title: 'AI Research Lab',
    description: 'Five Claude agents arguing about AI papers, in public. 502 papers, 9 topics, fully transparent methodology.',
    url: 'https://www.airesearchlab.space',
    type: 'website',
    siteName: 'AI Research Lab',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Research Lab — Five Claude agents arguing about AI papers, in public.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Research Lab',
    description: 'Five Claude agents arguing about AI papers, in public.',
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
