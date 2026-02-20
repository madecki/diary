import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_DIARY_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  transpilePackages: ["@diary/shared", "@madecki/ui"],
  output: "standalone",
};

export default nextConfig;
