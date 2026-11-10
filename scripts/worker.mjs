#!/usr/bin/env node
/**
 * Cloudflare Workers helper for this Next.js app (OpenNext adapter).
 *
 * Usage:
 *   node scripts/worker.mjs build    # build the Worker bundle into .open-next
 *   node scripts/worker.mjs preview  # build, then `wrangler dev` locally
 *   node scripts/worker.mjs deploy   # build, then `wrangler deploy`
 *
 * Why a wrapper exists:
 * 1. On this machine, foreign binaries (esbuild.exe, workerd.exe) are denied
 *    write access to the system temp folder. OpenNext and miniflare both
 *    write intermediate state there, so TEMP/TMP are pointed inside the repo.
 * 2. The Workers runtime (workerd) cannot execute Next.js Cache Components:
 *    requests hang. next.config.ts disables cacheComponents/partialPrefetching
 *    for this build (CLOUDFLARE_BUILD=1). Because `export const instant = ...`
 *    route segment configs are only valid with cacheComponents enabled, they
 *    are temporarily stripped from app/ route files during this build and
 *    restored afterwards. The Vercel build keeps both, unchanged.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  realpathSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const tmpDir = path.join(root, ".worker-tmp");
mkdirSync(tmpDir, { recursive: true });
const tmpReal = realpathSync(tmpDir);
process.env.TEMP = tmpReal;
process.env.TMP = tmpReal;
process.env.CLOUDFLARE_BUILD = "1";

const manifestPath = path.join(tmpReal, "instant-strip-manifest.json");

/** Restore files recorded in a leftover manifest from a previously killed run. */
function restoreFromManifest() {
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const [file, content] of Object.entries(manifest)) {
    writeFileSync(path.join(root, file), content);
    console.log(`worker.mjs: restored ${file}`);
  }
  rmSync(manifestPath);
}

restoreFromManifest();

const [command, ...extra] = process.argv.slice(2);

if (command === "restore") {
  console.log("worker.mjs: restore complete");
  process.exit(0);
}

const plans = {
  build: [["opennextjs-cloudflare", ["build"]]],
  preview: [
    ["opennextjs-cloudflare", ["build"]],
    ["wrangler", ["dev", ...extra]],
  ],
  deploy: [
    ["opennextjs-cloudflare", ["build"]],
    ["wrangler", ["deploy", ...extra]],
  ],
};

const plan = plans[command];
if (!plan) {
  console.error(
    `Unknown command: ${command ?? "(none)"}\nUse one of: ${Object.keys(plans).join(", ")}`,
  );
  process.exit(1);
}

restoreFromManifest();

// --- strip `export const instant = false;` for the Workers build ---
const appDir = path.join(root, "app");
/** @type {Record<string, string>} */
const manifest = {};
for (const file of collectRouteFiles(appDir, [])) {
  const content = readFileSync(file, "utf8");
  if (!/^export const instant = false;$/m.test(content)) continue;
  const rel = path.relative(root, file).split(path.sep).join("/");
  manifest[rel] = content;
  writeFileSync(file, content.replace(/^export const instant = false;\r?\n(\r?\n)?/gm, ""));
  console.log(`worker.mjs: stripped instant export from ${rel}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest));
const restore = () => {
  for (const [rel, content] of Object.entries(manifest)) {
    writeFileSync(path.join(root, rel), content);
  }
  rmSync(manifestPath);
};

function collectRouteFiles(dir, acc) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectRouteFiles(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

try {
  for (const [bin, args] of plan) {
    const result = spawnSync("npx", [bin, ...args], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.error) {
      console.error(result.error);
      process.exitCode = 1;
      break;
    }
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
} finally {
  if (Object.keys(manifest).length > 0) {
    restore();
    console.log("worker.mjs: instant exports restored");
  }
}
