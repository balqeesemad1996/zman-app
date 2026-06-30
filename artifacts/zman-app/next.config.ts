import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.replit.dev",
    "*.sisko.replit.dev",
    "*.repl.co",
    "*.replit.app",
  ],
};

export default nextConfig;
