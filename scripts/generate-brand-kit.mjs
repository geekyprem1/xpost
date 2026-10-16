import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { zipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/brand");
const flight = await readFile(path.join(root, "public/logos/shotlark-flight.svg"), "utf8");
const wordmark = await readFile(path.join(root, "public/logos/shotlark-wordmark.svg"), "utf8");
const bird = [...flight.matchAll(/<path\b[^>]*\/>/g)].map(([p]) => p).join("");
const letters = [...wordmark.matchAll(/<path\b[^>]*\/>/g)].map(([p]) => p).join("");
const wordWidth = Number(wordmark.match(/viewBox="0 0 ([\d.]+) 120"/)[1]);
const lockupWidth = wordWidth + 120;
const files = [];
const palettes = {
  white: { background: "#FFFFFF", ink: "#242334", mono: null },
  lavender: { background: "#F0ECFC", ink: "#242334", mono: null },
  purple: { background: "#6650D8", ink: "#FFFFFF", mono: "#FFFFFF" },
  transparent: { background: null, ink: "#242334", mono: null },
  black: { background: null, ink: "#000000", mono: "#000000" },
  reversed: { background: null, ink: "#FFFFFF", mono: "#FFFFFF" },
};

function mark(x, y, size, mono) {
  const paths = mono ? bird.replace(/fill="[^"]+"/g, `fill="${mono}"`) : bird;
  return `<g transform="translate(${x} ${y}) scale(${size / 96})">${paths}</g>`;
}
function lockup(cx, cy, width, palette) {
  return `<g transform="translate(${cx - width / 2} ${cy - (width / lockupWidth) * 60}) scale(${width / lockupWidth})">${mark(0, 12, 96, palette.mono)}<g transform="translate(120 0)" fill="${palette.ink}">${letters}</g></g>`;
}
function svg(width, height, content, background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Shotlark Flight logo">${background ? `<path fill="${background}" d="M0 0H${width}V${height}H0Z"/>` : ""}${content}</svg>\n`;
}
async function save(name, category, width, height, content, palette, note = "") {
  const directory = path.join(output, category);
  await mkdir(directory, { recursive: true });
  const source = svg(width, height, content, palette.background);
  const stem = `${category}/${name}-${width}x${height}`;
  const png = await sharp(Buffer.from(source)).png().toBuffer();
  await writeFile(path.join(output, `${stem}.svg`), source);
  await writeFile(path.join(output, `${stem}.png`), png);
  files.push({ name, category, width, height, png: `${stem}.png`, svg: `${stem}.svg`, bytes: png.length, note });
  return png;
}

// Square padding keeps the complete bird inside circular profile crops.
const profiles = [
  ["instagram", 320], ["facebook", 320], ["x", 400],
  ["linkedin", 400], ["linkedin-company", 300], ["youtube", 800],
  ["tiktok", 200], ["threads", 400], ["pinterest", 165],
  ["discord", 512], ["twitch", 600], ["whatsapp", 640],
];
for (const [platform, size] of profiles) {
  for (const variant of ["white", "purple", "lavender"]) {
    const palette = palettes[variant];
    await save(`${platform}-${variant}`, "profiles", size, size,
      mark(size * 0.09, size * 0.09, size * 0.82, palette.mono), palette,
      "Circle-safe square upload. Platforms may resize it for display.");
  }
}
for (const size of [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024, 2048]) {
  await save("flight-transparent", "icons", size, size, mark(0, 0, size), palettes.transparent);
}
for (const variant of ["transparent", "black", "reversed"]) {
  const palette = palettes[variant];
  await save(`flight-${variant}`, "masters", 2048, 2048, mark(0, 0, 2048, palette.mono), palette);
  await save(`wordmark-${variant}`, "masters", 1824, 480, lockup(912, 240, 1728, palette), palette,
    "Outlined vector lettering; no font installation required.");
}
const covers = [
  ["x-header", 1500, 500, 0.59, "Keep the centre-right logo clear of the lower-left profile image."],
  ["facebook-cover", 851, 315, 0.55, "Centred for mobile crops; check the platform preview before saving."],
  ["facebook-cover-2x", 1702, 630, 0.55, "Double-resolution Facebook cover."],
  ["linkedin-personal-cover", 1584, 396, 0.60, "Logo sits to the right of the profile-photo overlap."],
  ["linkedin-company-cover", 1128, 191, 0.60, "Company page cover; distinct from personal-profile dimensions."],
  ["youtube-banner", 2560, 1440, 0.5, "All branding fits within the central 1235 × 338 px area."],
  ["discord-server-banner", 960, 540, 0.5, "Banner availability depends on server features."],
  ["twitch-banner", 1920, 480, 0.5, "Keep important branding centred; platform overlays may vary."],
];
for (const [name, width, height, center, note] of covers) {
  const logoWidth = name === "youtube-banner" ? 1100 : Math.min(width * 0.48, height * 2.4);
  await save(name, "covers", width, height, lockup(width * center, height * 0.46, logoWidth, palettes.lavender), palettes.lavender, note);
}
const posts = [
  ["square-instagram-facebook-threads", 1080, 1080],
  ["portrait-instagram-facebook", 1080, 1350],
  ["portrait-instagram-3x4", 1080, 1440],
  ["instagram-landscape", 1080, 566],
  ["story-reel-tiktok-shorts", 1080, 1920],
  ["facebook-link-open-graph", 1200, 630],
  ["x-post", 1200, 675], ["x-card", 800, 418],
  ["linkedin-post", 1200, 627], ["youtube-thumbnail", 1280, 720],
  ["pinterest-pin", 1000, 1500], ["facebook-event", 1920, 1005],
];
for (const [name, width, height] of posts) {
  const palette = palettes.lavender;
  let content;
  if (height >= width) {
    const size = width * 0.32;
    content = mark((width - size) / 2, height / 2 - size * 0.92, size);
    const letterScale = width * 0.54 / wordWidth;
    content += `<g fill="${palette.ink}" transform="translate(${width * 0.23} ${height / 2 + size * 0.10}) scale(${letterScale})">${letters}</g>`;
  } else {
    content = lockup(width / 2, height / 2, width * 0.60, palette);
  }
  await save(name, "posts", width, height, content, palette,
    "Static branded artwork, not a video. Check the platform crop before publishing.");
}

// Next.js file-based metadata; the ICO contains PNG-compressed multi-size entries.
await writeFile(path.join(root, "app/icon.svg"), flight);
const apple = await sharp(Buffer.from(svg(180, 180, mark(16.2, 16.2, 147.6), "#F0ECFC"))).png().toBuffer();
await writeFile(path.join(root, "app/apple-icon.png"), apple);
const iconSizes = [16, 32, 48, 256];
const iconImages = await Promise.all(iconSizes.map(size => sharp(Buffer.from(svg(size, size, mark(0, 0, size)))).png().toBuffer()));
const icoHeader = Buffer.alloc(6 + iconSizes.length * 16);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(iconSizes.length, 4);
let offset = icoHeader.length;
iconImages.forEach((image, index) => {
  const entry = 6 + index * 16;
  icoHeader[entry] = iconSizes[index] % 256;
  icoHeader[entry + 1] = iconSizes[index] % 256;
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(image.length, entry + 8);
  icoHeader.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(path.join(root, "app/favicon.ico"), Buffer.concat([icoHeader, ...iconImages]));
const sources = [
  "https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo.html",
  "https://support.google.com/youtube/answer/12950272?hl=en",
  "https://www.linkedin.com/help/recruiter/answer/a568217/add-or-change-the-background-photo-on-your-profile?lang=en",
  "https://www.linearity.io/guide/social-media-image-sizes/",
];
await writeFile(path.join(output, "manifest.json"), JSON.stringify({ brand: "Shotlark", direction: "Flight", sources, files }, null, 2) + "\n");
const categories = [["masters", "Vector masters"], ["profiles", "Profile pictures"], ["covers", "Covers & banners"], ["posts", "Posts & stories"], ["icons", "Transparent icons"]];
const sections = categories.map(([category, label]) => `<details ${category === "masters" || category === "covers" ? "open" : ""}><summary>${label}<span>${files.filter(f => f.category === category).length} sizes / variants</span></summary><div class="grid">${files.filter(f => f.category === category).map(f => `<article><div class="preview ${f.name.includes("reversed") ? "dark" : ""}"><img loading="lazy" src="${f.png}" alt="${f.name.replaceAll("-", " ")}" width="${f.width}" height="${f.height}"></div><div class="info"><h3>${f.name.replaceAll("-", " ")}</h3><p>${f.width} × ${f.height} px</p>${f.note ? `<small>${f.note}</small>` : ""}<nav><a download href="${f.png}">PNG ↓</a><a download href="${f.svg}">SVG ↓</a></nav></div></article>`).join("")}</div></details>`).join("");
await writeFile(path.join(output, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Shotlark — Flight brand kit</title><link rel="icon" href="icons/flight-transparent-32x32.png"><style>
:root{color-scheme:light;--ink:#242334;--muted:#696779;--purple:#6650d8;--line:#e4e1ec}*{box-sizing:border-box}body{margin:0;background:#f6f5f9;color:var(--ink);font-family:'Segoe UI',Arial,sans-serif}main{max-width:1200px;margin:auto;padding:40px 24px}header{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:24px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--purple);font-weight:700}h1{font-size:40px;letter-spacing:-1.5px;margin:8px 0}p{color:var(--muted);line-height:1.6}.button{background:var(--purple);color:white;border:0;padding:14px 20px;white-space:nowrap}.hero{background:#f0ecfc;border:1px solid var(--line);border-radius:20px;display:grid;place-items:center;padding:45px 24px;margin-bottom:30px}.hero img{width:min(500px,100%);height:auto}details{margin:18px 0;border-top:1px solid var(--line)}summary{cursor:pointer;padding:22px 0;font-size:20px;font-weight:650}summary span{font-size:12px;color:var(--muted);font-weight:400;margin-left:16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{background:white;border:1px solid var(--line);border-radius:14px;overflow:hidden}.preview{height:180px;padding:22px;display:grid;place-items:center;background:repeating-conic-gradient(#efedf4 0% 25%,#faf9fc 0% 50%) 50% / 18px 18px}.preview.dark{background:#242334}.preview img{max-height:136px;max-width:100%;object-fit:contain;width:auto;height:auto}.info{padding:18px}h3{font-size:14px;margin:0;text-transform:capitalize;overflow-wrap:anywhere}.info p{font:12px Consolas,monospace}.info small{display:block;line-height:1.5;min-height:38px;color:var(--muted)}nav{display:flex;gap:8px;margin-top:14px}a{display:inline-flex;align-items:center;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:9px;text-decoration:none;color:var(--ink);font-size:13px;font-weight:600}a:hover{filter:brightness(.94)}a:focus-visible,summary:focus-visible{outline:3px solid var(--purple);outline-offset:4px}footer{margin-top:32px;font-size:12px;color:var(--muted)}footer a{font-size:12px;border:0;padding:4px 10px 4px 0} @media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:550px){header{display:block}h1{font-size:32px}.grid{grid-template-columns:1fr}summary span{display:block;margin:6px 0 0}.hero{padding:30px 18px}}
</style></head><body><main><header><div><div class="eyebrow">Shotlark / Official identity</div><h1>Flight. Ready for everywhere.</h1><p>${files.length} assets, each in PNG + SVG. Profile, cover, post and icon sizes.</p></div><a class="button" href="shotlark-flight-brand-kit.zip" download>Download full kit ↓</a></header><div class="hero"><img src="masters/wordmark-transparent-1824x480.svg" width="1824" height="480" alt="Shotlark Flight logo and wordmark"></div>${sections}<footer><p>Profiles: circle-safe padding, three backgrounds. Masters: colour, black and white, with transparent backgrounds. All lettering is outlined. Platform crops and UI overlays can vary; preview before publishing.</p><p>The ZIP contains this gallery, the manifest and all PNG / SVG files. Rebuild: <code>npm run brand:generate</code>.</p><nav aria-label="Dimension references">${sources.map((url, i) => `<a href="${url}">Size reference ${i + 1} ↗</a>`).join("")}</nav></footer></main></body></html>\n`);
const archive = {};
for (const file of ["index.html", "manifest.json", ...files.flatMap(file => [file.png, file.svg])]) {
  archive[file] = await readFile(path.join(output, file));
}
for (const file of ["favicon.ico", "icon.svg", "apple-icon.png"]) {
  archive[`web/${file}`] = await readFile(path.join(root, "app", file));
}
await writeFile(path.join(output, "shotlark-flight-brand-kit.zip"), zipSync(archive));
console.log(`Generated ${files.length} PNGs + ${files.length} SVGs, manifest, gallery, favicon, SVG icon and Apple icon.`);
