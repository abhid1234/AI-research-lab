import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@research-lab/db'],
  // Move the Next.js dev indicator out of the bottom-left so it doesn't pollute
  // visual QA screenshots. Only renders in dev; absent from prod builds.
  devIndicators: {
    position: 'bottom-right',
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async redirects() {
    // Canonical host is www.airesearchlab.space — the apex (no-www)
    // 308-redirects to it so every link, share, and crawl converges on
    // a single hostname.
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'airesearchlab.space' }],
        destination: 'https://www.airesearchlab.space/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
