export function createWatermarkCanvas(
  text = "Made with Shotlark",
): HTMLCanvasElement {
  const renderScale = 2;
  const height = 36 * renderScale;
  const fontSize = 19 * renderScale;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Unable to create a 2D rendering context");
  const font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  measureCtx.font = font;
  const textWidth = measureCtx.measureText(text).width;

  const dotArea = height + 6 * renderScale;
  const width = Math.ceil(dotArea + textWidth + 16 * renderScale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create a 2D rendering context");

  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, height / 2);
  ctx.fillStyle = "rgba(12, 12, 18, 0.44)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(dotArea / 2, height / 2, 5 * renderScale, 0, Math.PI * 2);
  ctx.fillStyle = "#8f7bff";
  ctx.fill();

  ctx.font = font;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.textBaseline = "middle";
  ctx.fillText(text, height * 0.9, height / 2 + renderScale);

  return canvas;
}
