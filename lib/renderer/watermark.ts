// Paths from public/logos/shotlark-flight.svg (viewBox 0 0 96 96). Inlined so
// the watermark can be drawn synchronously, without waiting on an image load.
const LOGO_VIEWBOX = 96;
const LOGO_PATHS: Array<{ fill: string; d: string }> = [
  {
    fill: "#6650D8",
    d: "M12 53 44 61 29 83 57 68Q66 63 70 52L76 36 89 29 74 27Q69 17 60 24L48 35 19 13 35 46Z",
  },
  { fill: "#B4A6F4", d: "m19 13 29 22 14 9-27 2Z" },
];

export function createWatermarkCanvas(text = "Shotlark"): HTMLCanvasElement {
  const renderScale = 2;
  const height = 36 * renderScale;
  const fontSize = 19 * renderScale;
  const padding = 5 * renderScale;
  const badgeSize = height - padding * 2;
  const gap = 8 * renderScale;
  const paddingRight = 14 * renderScale;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Unable to create a 2D rendering context");
  const font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  measureCtx.font = font;
  const textWidth = measureCtx.measureText(text).width;

  const textX = padding + badgeSize + gap;
  const width = Math.ceil(textX + textWidth + paddingRight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create a 2D rendering context");

  // Pill background
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, height / 2);
  ctx.fillStyle = "rgba(12, 12, 18, 0.44)";
  ctx.fill();

  // Light circular badge so the purple logo stays visible on the dark pill
  ctx.beginPath();
  ctx.arc(padding + badgeSize / 2, height / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#f0ecfc";
  ctx.fill();

  // Logo inside the badge
  const logoSize = badgeSize * 0.82;
  ctx.save();
  ctx.translate(padding + (badgeSize - logoSize) / 2, (height - logoSize) / 2);
  ctx.scale(logoSize / LOGO_VIEWBOX, logoSize / LOGO_VIEWBOX);
  for (const { fill, d } of LOGO_PATHS) {
    ctx.fillStyle = fill;
    ctx.fill(new Path2D(d));
  }
  ctx.restore();

  ctx.font = font;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.textBaseline = "middle";
  ctx.fillText(text, textX, height / 2 + renderScale);

  return canvas;
}
