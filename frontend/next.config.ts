import type { NextConfig } from "next";

// El navegador le pide /api/* al mismo origen del frontend (puerto 3001) y Next lo reenvía a la
// API. Así no hace falta configurar CORS en el backend.
const API_URL = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
