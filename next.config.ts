import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  webpack: (config) => {
    config.externals.push('@prisma/client');
    return config;
  },
  turbopack: {
    resolveAlias: {
      '@prisma/client': '@prisma/client',
    },
  },
};

export default nextConfig;
