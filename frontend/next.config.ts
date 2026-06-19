import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Lint errors in component library files won't block production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
