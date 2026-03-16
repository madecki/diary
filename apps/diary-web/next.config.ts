import type { NextConfig } from "next";

// Diary-web is served through the gateway at /mfe/diary (iframe-only path).
// The shell is the top-level document for all /app/* routes; diary is embedded
// inside the shell's iframe so both share the same origin for httpOnly cookies.
const basePath = process.env.NEXT_PUBLIC_DIARY_BASE_PATH ?? "/mfe/diary";

// In development, asset URLs must include basePath so the dev server (which
// serves assets at /mfe/diary/_next/static/...) matches what we emit.
const assetPrefix =
  process.env.NODE_ENV === "development"
    ? `http://localhost:4280${basePath}`
    : undefined;

const nextConfig: NextConfig = {
  basePath,
  transpilePackages: ["@diary/shared"],
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
