import type { NextConfig } from 'next';

// Front-end only: all data comes from the in-browser mock in src/lib/mock/server.ts.
const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
