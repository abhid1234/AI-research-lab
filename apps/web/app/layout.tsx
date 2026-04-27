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
  title: 'AI Research Lab',
  description: 'Agent-powered research paper observatory — ingest AI papers, run 5 specialist agents, explore interactive visual artifacts.',
  openGraph: {
    title: 'AI Research Lab',
    description: 'Agent-powered research paper observatory — ingest AI papers, run 5 specialist agents, explore interactive visual artifacts.',
    type: 'website',
    siteName: 'AI Research Lab',
  },
  twitter: {
    card: 'summary',
    title: 'AI Research Lab',
    description: 'Agent-powered research paper observatory',
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
      {/* Inline theme script: reads localStorage before React hydrates to prevent flash.
          Default light (matches new editorial palette); dark only if explicitly chosen. */}
      <head>
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script
          // nosec: static string, no user-controlled input
          // biome-ignore lint: intentional dangerouslySetInnerHTML for theme flash prevention
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
