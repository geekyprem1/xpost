const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const QUERIES = [
  ["liquid abstract", "Liquid Silk"],
  ["gradient loop", "Gradient Glow"],
  ["neon waves", "Neon Waves"],
  ["particles loop", "Particle Drift"],
  ["abstract smoke", "Color Smoke"],
  ["aurora abstract", "Aurora Flow"],
  ["fluid ink", "Ink Bloom"],
  ["gold particles", "Golden Dust"],
  ["geometric loop", "Geometric Motion"],
  ["abstract waves", "Soft Waves"],
  ["abstract loop", "Abstract Flow"],
  ["space loop", "Cosmic Drift"],
];

async function main() {
  const env = await fs.readFile(".env.local", "utf8");
  const key = env
    .match(/^PIXABAY_API_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]
    ?.trim();
  if (!key) throw new Error("PIXABAY_API_KEY is not configured");
  const manifestPath = path.resolve("lib/backgrounds/motion-presets.json");
  const output = path.resolve("public/motion");
  const existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const selected = [...existing];
  const seen = new Set(existing.map((v) => v.source.match(/id-(\d+)/)?.[1]));
  const target = existing.length + 20;
  let nextId =
    Math.max(...existing.map((v) => Number(v.id.replace("loop-", "")))) + 1;
  const probe = spawnSync("ffmpeg", ["-version"], { windowsHide: true });
  if (probe.status !== 0) throw new Error("ffmpeg is required for thumbnails");
  for (const [query, label] of QUERIES) {
    const url = new URL("https://pixabay.com/api/videos/");
    for (const [name, value] of Object.entries({
      key,
      q: query,
      per_page: "50",
      safesearch: "true",
      video_type: "animation",
      order: "popular",
    }))
      url.searchParams.set(name, value);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok)
      throw new Error("Motion search failed: " + response.status);
    const data = await response.json();
    let count = 0;
    for (const hit of data.hits || []) {
      if (seen.has(String(hit.id)) || hit.duration < 5 || hit.duration > 60)
        continue;
      const rendition = [
        hit.videos?.small,
        hit.videos?.medium,
        hit.videos?.tiny,
      ].find(
        (v) =>
          v &&
          v.width >= 640 &&
          v.width >= v.height &&
          v.size < 6 * 1024 * 1024,
      );
      if (!rendition) continue;
      const id = "loop-" + String(nextId).padStart(2, "0");
      const filename = path.join(output, id + ".mp4");
      // New IDs only: never overwrite the library's existing files.
      try {
        await fs.access(filename);
        throw new Error("Asset already exists: " + id);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const video = await fetch(rendition.url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!video.ok) throw new Error("Video download failed: " + video.status);
      await fs.writeFile(filename, Buffer.from(await video.arrayBuffer()));
      const poster = spawnSync(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-ss",
          "0.5",
          "-i",
          filename,
          "-frames:v",
          "1",
          "-vf",
          "scale=480:-2",
          path.join(output, id + ".webp"),
        ],
        { encoding: "utf8", windowsHide: true },
      );
      if (poster.status !== 0)
        throw new Error("Could not generate thumbnail: " + id);
      seen.add(String(hit.id));
      selected.push({
        id,
        label: label + " " + (count + 1),
        url: "/motion/" + id + ".mp4",
        previewUrl: "/motion/" + id + ".webp",
        width: rendition.width,
        height: rendition.height,
        duration: hit.duration,
        source: hit.pageURL,
        tags: hit.tags,
        credit: { name: hit.user || "Pixabay", url: hit.pageURL },
      });
      // Persist each successful addition so an interrupted run is reviewable.
      await fs.writeFile(
        manifestPath,
        JSON.stringify(selected, null, 2) + "\n",
      );
      await fs.writeFile(
        path.join(output, "SOURCES.md"),
        "# Motion background sources\n\nDownloaded from Pixabay for use in composited artwork.\nLicense: https://pixabay.com/service/license-summary/\n\n" +
          selected
            .map(
              (v) =>
                "- " +
                v.id +
                " (" +
                v.label +
                "): " +
                v.source +
                " by " +
                v.credit.name,
            )
            .join("\n") +
          "\n",
      );
      console.log(
        "Added " +
          id +
          " | " +
          hit.tags +
          " | " +
          (rendition.size / 1024 / 1024).toFixed(1) +
          " MB",
      );
      nextId++;
      count++;
      if (count >= 2 || selected.length === target) break;
    }
    if (selected.length === target) break;
  }
  if (selected.length !== target)
    throw new Error(
      "Expected 20 additions; got " + (selected.length - existing.length),
    );
  console.log("Library contains " + selected.length + " motion backgrounds.");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
