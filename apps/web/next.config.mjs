/** @type {import('next').NextConfig} */
const rawApiBase = process.env.API_BASE ?? "http://localhost:8101";
const API_BASE = /^https?:\/\//.test(rawApiBase) ? rawApiBase : `http://${rawApiBase}`;

const nextConfig = {
  async rewrites() {
    // All /v1/* calls proxied to FastAPI — browser uses relative URLs,
    // so CORS is irrelevant (same-origin) and API_SECRET never reaches the browser.
    return [{ source: "/v1/:path*", destination: `${API_BASE}/v1/:path*` }];
  },
};

export default nextConfig;
