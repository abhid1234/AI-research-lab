import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {/* Inline theme script: reads localStorage before React hydrates to prevent flash.
          Content is a static string with no user input — not an XSS risk. */}
      <head>
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script
          // nosec: static string, no user-controlled input
          // biome-ignore lint: intentional dangerouslySetInnerHTML for theme flash prevention
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
