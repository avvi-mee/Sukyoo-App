import type { NextConfig } from 'next';

const config: NextConfig = {
  // packages/core ships raw TypeScript for Metro; Next must compile it too if
  // this app ever imports from it.
  transpilePackages: ['@sukyoo/core'],
  eslint: { ignoreDuringBuilds: true },
};

export default config;
