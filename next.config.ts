import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships native binaries per-platform — keep it out of the serverless
  // bundle and let Vercel's build install the correct linux binary itself.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
