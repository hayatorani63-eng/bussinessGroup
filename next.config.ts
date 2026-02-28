// Triggering fresh build to ensure latest deployment is reflected
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
