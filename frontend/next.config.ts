import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

if (!backendUrl) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL must be set when building for production.");
}

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      }
    ];
  }
  
};

export default nextConfig;
