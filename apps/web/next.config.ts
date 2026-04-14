import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In production, NEXT_PUBLIC_API_BASE is set and the frontend calls the API directly.
    // In local dev (no NEXT_PUBLIC_API_BASE), proxy /v1/* to the FastAPI backend.
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8101";
    if (process.env.NEXT_PUBLIC_API_BASE) return [];
    return [
      {
        source: "/v1/:path*",
        destination: `${apiBase}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
