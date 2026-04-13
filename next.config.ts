import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Explicitly use Turbopack (default in Next.js 16).
  // Turbopack stubs Node built-ins (fs, os, path, crypto…) automatically
  // for browser bundles, so no webpack fallback config is needed.
  turbopack: {},

  reactStrictMode: false,
};

export default nextConfig;
