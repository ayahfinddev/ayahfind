import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const apiPublic = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const apiProxy =
  process.env.API_PROXY_URL?.replace(/\/$/, "") ||
  process.env.API_UPSTREAM_URL?.replace(/\/$/, "") ||
  process.env.BACKEND_URL?.replace(/\/$/, "") ||
  (!isProd ? "http://127.0.0.1:8000" : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    if (apiPublic) return [];
    if (!apiProxy) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxy}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
