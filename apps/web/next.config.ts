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
};

export default nextConfig;
