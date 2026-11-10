import type { NextConfig } from "next";

// Cache Components requires Node.js runtime semantics (notably setTimeout()
// behavior) that the Cloudflare Workers runtime (workerd) does not implement —
// on Workers it produces hung requests. This app never uses `use cache`, so
// disabling it for the Cloudflare build only turns off the PPR /
// partial-prefetching optimization on that target; Vercel builds keep it.
//
// Detection covers every way this app gets built for Workers:
//   CLOUDFLARE_BUILD=1      — set by scripts/worker.mjs (local CLI)
//   WORKERS_CI              — set by Cloudflare Workers Builds (Git CI)
//   npm_lifecycle_event     — `npm run build:worker` / `deploy:worker`
const isCloudflareBuild =
  process.env.CLOUDFLARE_BUILD === "1" ||
  Boolean(process.env.WORKERS_CI) ||
  (process.env.npm_lifecycle_event ?? "").endsWith(":worker");

const nextConfig: NextConfig = {
  ...(isCloudflareBuild
    ? {}
    : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
