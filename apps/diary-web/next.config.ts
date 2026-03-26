import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const turbopackRoot = path.join(thisDir, "../..");

// Diary-web is served through the gateway at /mfe/diary (iframe-only path).
// The shell is the top-level document for all /app/* routes; diary is embedded
// inside the shell's iframe so both share the same origin for httpOnly cookies.
// Use ?? so that an explicit empty string (e.g. E2E mode) means "no prefix"
// while an absent env var still defaults to /mfe/diary.
const basePath = process.env.NEXT_PUBLIC_DIARY_BASE_PATH ?? "/mfe/diary";

// In development, when NOT running via the gateway, point asset URLs at the
// diary dev server. When running via the gateway (NEXT_PUBLIC_VIA_GATEWAY=true),
// use path-only assetPrefix so assets are at /mfe/diary/_next/... (same origin,
// gateway proxies to diary) and HMR works. Using undefined here would make
// Next emit /_next/... (no basePath), which the shell would handle and return
// wrong content (MIME/404).
const assetPrefix =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_VIA_GATEWAY === "true"
      ? basePath
      : `http://localhost:4280${basePath}`
    : undefined;

const nextConfig: NextConfig = {
  basePath,
  transpilePackages: ["@diary/shared"],
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    root: turbopackRoot,
  },
  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
