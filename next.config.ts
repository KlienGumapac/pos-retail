import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove output: 'export' for API routes to work
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Remove distDir for Vercel deployment
  // distDir: 'out'
};

export default nextConfig;
