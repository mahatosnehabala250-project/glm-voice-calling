import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://preview-chat-e536f84d-5df8-41ea-9d04-6b5ba1ce2e36.space.z.ai",
  ],
};

export default nextConfig;
