const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function main() {
  const env = await fs.readFile(".env.local", "utf8");
  const key = env
    .match(/^PIXABAY_API_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]
    ?.trim();
  if (!key) throw new Error("PIXABAY_API_KEY is not configured");
  const output = path.resolve("public/motion");
  await fs.mkdir(output, { recursive: true });
  const selected = [];
  const seen = new Set();
  for (const query of [
    "abstract loop",
    "particles loop",
    "gradient loop",
    "space loop",
    "waves loop",
  ]) {
    const url = new URL("https://pixabay.com/api/videos/");
    for (const [name, value] of Object.entries({
      key,
      q: query,
      per_page: "30",
      safesearch: "true",
      video_type: "animation",
    }))
      url.searchParams.set(name, value);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error("Motion search failed: " + response.status);
    const data = await response.json();
    let count = 0;
    for (const hit of data.hits || []) {
      if (seen.has(hit.id)) continue;
      const rendition = [
        hit.videos?.small,
        hit.videos?.medium,
        hit.videos?.tiny,
      ].find((v) => v && v.width >= 640 && v.size < 12 * 1024 * 1024);
      if (!rendition) continue;
      seen.add(hit.id);
      const id = "loop-" + (selected.length + 1).toString().padStart(2, "0");
      const video = await fetch(rendition.url);
      if (!video.ok) throw new Error("Video download failed: " + video.status);
      const filename = path.join(output, id + ".mp4");
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
        throw new Error("Could not generate motion thumbnail");
      const labels = {
        "abstract loop": "Abstract Flow",
        "particles loop": "Particle Drift",
        "gradient loop": "Gradient Motion",
        "space loop": "Cosmic Loop",
        "waves loop": "Wave Flow",
      };
      selected.push({
        id,
        label: labels[query] + " " + (count + 1),
        url: "/motion/" + id + ".mp4",
        previewUrl: "/motion/" + id + ".webp",
        width: rendition.width,
        height: rendition.height,
        duration: hit.duration,
        source: hit.pageURL,
        tags: hit.tags,
        credit: { name: hit.user || "Pixabay", url: hit.pageURL },
      });
      console.log(
        "Downloaded " +
          id +
          " (" +
          rendition.width +
          " x " +
          rendition.height +
          ")",
      );
      count++;
      if (count >= 2 || selected.length === 10) break;
    }
    if (selected.length === 10) break;
  }
  if (selected.length !== 10)
    throw new Error("Expected ten backgrounds; downloaded " + selected.length);
  await fs.writeFile(
    path.resolve("lib/backgrounds/motion-presets.json"),
    JSON.stringify(selected, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(output, "SOURCES.md"),
    "# Motion background sources\n\nDownloaded from Pixabay for use in composited artwork.\nLicense: https://pixabay.com/service/license-summary/\n\n" +
      selected
        .map((v) => "- " + v.id + ": " + v.source + " by " + v.credit.name)
        .join("\n") +
      "\n",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
