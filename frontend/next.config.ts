import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jsdom', 'isomorphic-dompurify', '@exodus/bytes'],
};

export default nextConfig;
