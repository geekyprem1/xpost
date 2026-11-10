import type { NextConfig } from "next";

// Cache Components requires Node.js runtime semantics (notably setTimeout()
// behavior) that the Cloudflare Workers runtime (workerd) does not implement —
// on Workers it produces hung requests. This app never uses `use cache`, so
// disabling it for the Cloudflare build only turns off the PPR /
// partial-prefetching optimization on that target; Vercel builds keep it.
const isCloudflareBuild =
  process.env.CLOUDFLARE_BUILD === "1" ||
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
