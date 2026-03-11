import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_DIARY_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  transpilePackages: ["@diary/shared"],
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
