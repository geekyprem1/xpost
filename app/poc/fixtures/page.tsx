"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ANNOTATION_STYLE,
  buildAnnotationLayer,
} from "@/lib/editor/annotation-tools";
import { buildRedactLayer } from "@/lib/editor/redact-tools";
import { createTextLayer } from "@/lib/editor/text-presets";
import {
  compositeImageLayers,
  parseHexColor,
  pixelBlockSize,
} from "@/lib/layers/image-composite";
import { rasterizeTextLayers } from "@/lib/layers/text-raster";
import {
  createDefaultScene,
  croppedImageSize,
  type RedactLayer,
  type Scene,
} from "@/lib/scene";
import {
  computeOutputSize,
  createWatermarkCanvas,
  WebGL2Renderer,
} from "@/lib/renderer";

type FixtureResult = {
  id: string;
  label: string;
  status: "pass" | "fail";
  meanDiff: number;
  maxDiff: number;
  p99Diff: number;
  ms1x: number;
  ms2x: number;
  width: number;
  height: number;
  previewUrl: string;
  exportUrl: string;
  redaction?: { ok: boolean; detail: string };
};

declare global {
  interface Window {
    __FIXTURE_RESULTS__?: { done: boolean; results: FixtureResult[] };
  }
}

const FIXTURE_WIDTH = 600;

function makeScreenshotCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create a 2D rendering context");
  ctx.fillStyle = "#12131a";
  ctx.fillRect(0, 0, 1600, 1000);
  ctx.fillStyle = "#1b1d29";
  ctx.fillRect(0, 0, 1600, 64);
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("Fixture dashboard", 32, 42);
  ctx.fillStyle = "#232536";
  ctx.fillRect(0, 64, 360, 936);
  ctx.fillStyle = "#6c5ce7";
  ctx.fillRect(40, 120, 280, 44);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "#2e3146";
    ctx.fillRect(40, 200 + i * 60, 280 - i * 12, 24);
  }
  for (let i = 0; i < 3; i++) {
    const x = 420 + i * 380;
    ctx.fillStyle = "#1a1c28";
    ctx.fillRect(x, 140, 340, 420);
    ctx.fillStyle = "#8f7bff";
    ctx.fillRect(x + 20, 160, 300, 180);
    ctx.fillStyle = "#3a3d52";
    for (let line = 0; line < 5; line++) {
      ctx.fillRect(x + 20, 380 + line * 30, 300 - line * 34, 14);
    }
  }
  return canvas;
}

function buildFixtures(): { id: string; label: string; scene: Scene }[] {
  const base = () => {
    const scene = createDefaultScene();
    scene.canvas.baseWidth = FIXTURE_WIDTH;
    return scene;
  };

  const shadow = base();
  shadow.transform.padding = 70;
  shadow.layout.radius = 26;
  shadow.layout.shadow = 55;

  const glassTilt = base();
  glassTilt.style.preset = "glass-light";
  glassTilt.style.corner = "round";
  glassTilt.transform.padding = 90;
  glassTilt.transform.tiltX = 14;
  glassTilt.transform.tiltY = -16;

  const sunlightGrain = base();
  sunlightGrain.background = { kind: "solid", color: "#101018" };
  sunlightGrain.style.preset = "border-dark";
  sunlightGrain.sunlight.overlay = "golden";
  sunlightGrain.sunlight.strength = 60;
  sunlightGrain.sunlight.angle = 40;
  sunlightGrain.sunlight.grain = 35;

  const minimal = base();
  minimal.background = {
    kind: "gradient",
    stops: [
      { color: "#0f1230", at: 0 },
      { color: "#5c3b8f", at: 1 },
    ],
    angle: 120,
  };
  minimal.style.shadow = "none";
  minimal.style.corner = "sharp";
  minimal.transform.padding = 60;

  const text = base();
  text.background = { kind: "solid", color: "#171428" };
  text.style.shadow = "none";
  text.transform.padding = 60;
  text.layers = [
    createTextLayer("headline", {
      x: 0.5,
      y: 0.26,
      width: 0.76,
      text: "Ship it.",
    }),
    createTextLayer("badge", {
      x: 0.18,
      y: 0.06,
      width: 0.24,
      text: "NEW",
    }),
  ];

  const annotations = base();
  annotations.background = { kind: "solid", color: "#141521" };
  annotations.style.shadow = "none";
  annotations.transform.padding = 70;
  annotations.transform.tiltX = 14;
  annotations.transform.tiltY = -12;
  annotations.transform.zoom = 90;
  const style = DEFAULT_ANNOTATION_STYLE;
  annotations.layers = [
    buildAnnotationLayer(
      "highlight",
      { x: 0.12, y: 0.62 },
      { x: 0.58, y: 0.78 },
      { ...style, color: "#ffd60a" },
      annotations,
    )!,
    buildAnnotationLayer(
      "rect",
      { x: 0.14, y: 0.2 },
      { x: 0.46, y: 0.5 },
      { ...style, color: "#ff3355" },
      annotations,
    )!,
    buildAnnotationLayer(
      "arrow",
      { x: 0.52, y: 0.28 },
      { x: 0.86, y: 0.6 },
      { ...style, color: "#ffd60a", bend: 0.35, head: true },
      annotations,
    )!,
    buildAnnotationLayer(
      "step",
      { x: 0.66, y: 0.18 },
      { x: 0.66, y: 0.18 },
      { ...style, color: "#3b82f6" },
      annotations,
    )!,
    buildAnnotationLayer(
      "emoji",
      { x: 0.87, y: 0.18 },
      { x: 0.87, y: 0.18 },
      { ...style, emoji: "🔥" },
      annotations,
    )!,
  ];

  const cropped = base();
  cropped.background = { kind: "solid", color: "#101018" };
  cropped.style.shadow = "none";
  cropped.transform.padding = 50;
  cropped.image = {
    path: "fixture",
    width: 1600,
    height: 1000,
    crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 },
  };

  const redacted = base();
  redacted.background = { kind: "solid", color: "#141521" };
  redacted.style.shadow = "none";
  redacted.transform.padding = 40;
  redacted.layers = [
    buildRedactLayer(
      { x: 0.01, y: 0.01 },
      { x: 0.3, y: 0.09 },
      { mode: "solid", strength: 100, color: "#ff00aa" },
    )!,
    buildRedactLayer(
      { x: 0.34, y: 0.12 },
      { x: 0.64, y: 0.34 },
      { mode: "pixelate", strength: 90, color: "#000000" },
    )!,
    buildRedactLayer(
      { x: 0.66, y: 0.12 },
      { x: 0.97, y: 0.34 },
      { mode: "blur", strength: 85, color: "#000000" },
    )!,
  ];

  return [
    { id: "shadow", label: "Gradient + shadow + rounded", scene: shadow },
    { id: "glass-tilt", label: "Glass + perspective tilt", scene: glassTilt },
    {
      id: "sunlight-grain",
      label: "Sunlight + grain + border",
      scene: sunlightGrain,
    },
    { id: "minimal", label: "Sharp + no shadow + watermark", scene: minimal },
    { id: "text", label: "Text layers (font + pill)", scene: text },
    {
      id: "annotations",
      label: "Annotations + tilt (arrow + shapes + step)",
      scene: annotations,
    },
    { id: "crop", label: "Crop (UV crop + aspect)", scene: cropped },
    {
      id: "redact",
      label: "Redaction (solid + pixelate + blur)",
      scene: redacted,
    },
  ];
}

function checkRedaction(
  composite: HTMLCanvasElement,
  layers: Scene["layers"],
  source: HTMLCanvasElement,
): { ok: boolean; detail: string } {
  const context = composite.getContext("2d");
  if (!context) return { ok: false, detail: "no 2D context" };
  const redacts = layers.filter(
    (layer): layer is RedactLayer => layer.kind === "redact" && layer.visible,
  );
  if (redacts.length === 0) return { ok: true, detail: "none" };

  const width = composite.width;
  const height = composite.height;
  const data = context.getImageData(0, 0, width, height).data;
  const sourceContext = source.getContext("2d");
  const sourceData =
    sourceContext && source.width === width && source.height === height
      ? sourceContext.getImageData(0, 0, width, height).data
      : null;
  const pixel = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };

  for (const layer of redacts) {
    const x = Math.max(0, Math.round(layer.x * width));
    const y = Math.max(0, Math.round(layer.y * height));
    const w = Math.max(1, Math.min(width - x, Math.round(layer.w * width)));
    const h = Math.max(1, Math.min(height - y, Math.round(layer.h * height)));

    if (layer.mode === "solid") {
      const rgb = parseHexColor(layer.color);
      if (!rgb) return { ok: false, detail: "invalid solid color" };
      const stepX = Math.max(1, Math.floor(w / 8));
      const stepY = Math.max(1, Math.floor(h / 8));
      for (let yy = y; yy < y + h; yy += stepY) {
        for (let xx = x; xx < x + w; xx += stepX) {
          const [r, g, b] = pixel(
            Math.min(xx, x + w - 1),
            Math.min(yy, y + h - 1),
          );
          if (r !== rgb[0] || g !== rgb[1] || b !== rgb[2]) {
            return { ok: false, detail: `solid mismatch at ${xx},${yy}` };
          }
        }
      }
      continue;
    }

    if (layer.mode === "pixelate") {
      const block = pixelBlockSize(layer.strength, w, h);
      const cellsX = Math.max(1, Math.ceil(w / block));
      const cellsY = Math.max(1, Math.ceil(h / block));
      for (let cellY = 0; cellY < cellsY; cellY++) {
        for (let cellX = 0; cellX < cellsX; cellX++) {
          const x0 = x + Math.floor((cellX * w) / cellsX);
          const x1 = x + Math.floor(((cellX + 1) * w) / cellsX);
          const y0 = y + Math.floor((cellY * h) / cellsY);
          const y1 = y + Math.floor(((cellY + 1) * h) / cellsY);
          const first = pixel(x0, y0);
          const last = pixel(
            Math.min(x1 - 1, width - 1),
            Math.min(y1 - 1, height - 1),
          );
          if (
            first[0] !== last[0] ||
            first[1] !== last[1] ||
            first[2] !== last[2]
          ) {
            return {
              ok: false,
              detail: `pixelate block not uniform at ${x0},${y0}`,
            };
          }
        }
      }
      continue;
    }

    if (!sourceData) continue;
    let sum = 0;
    let count = 0;
    const stepX = Math.max(1, Math.floor(w / 24));
    const stepY = Math.max(1, Math.floor(h / 24));
    for (let yy = y; yy < y + h; yy += stepY) {
      for (let xx = x; xx < x + w; xx += stepX) {
        const index = (yy * width + xx) * 4;
        for (let channel = 0; channel < 3; channel++) {
          sum += Math.abs(data[index + channel] - sourceData[index + channel]);
          count++;
        }
      }
    }
    const mean = count > 0 ? sum / count : 0;
    if (mean < 5) {
      return {
        ok: false,
        detail: `blur too weak (mean diff ${mean.toFixed(1)})`,
      };
    }
  }

  return { ok: true, detail: "ok" };
}

function compareImages(
  base: ImageData,
  other: ImageData,
): { mean: number; max: number; p99: number } {
  const diffs: number[] = [];
  for (let i = 0; i < base.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      diffs.push(Math.abs(base.data[i + channel] - other.data[i + channel]));
    }
  }
  let sum = 0;
  let max = 0;
  for (const value of diffs) {
    sum += value;
    if (value > max) max = value;
  }
  diffs.sort((a, b) => a - b);
  return {
    mean: sum / diffs.length,
    max,
    p99: diffs[Math.floor(diffs.length * 0.99)],
  };
}

export default function FixturesPocPage() {
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [results, setResults] = useState<FixtureResult[]>([]);
  const [running, setRunning] = useState(true);

  const run = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const canvas = rendererCanvasRef.current;
    if (!canvas) return;
    const renderer = new WebGL2Renderer();
    await renderer.init(canvas);
    await document.fonts.ready;
    const screenshot = makeScreenshotCanvas();
    const screenshotSize = { width: 1600, height: 1000 };
    renderer.setAssets({
      screenshot,
      screenshotSize,
      watermark: createWatermarkCanvas(),
    });

    const collected: FixtureResult[] = [];
    for (const fixture of buildFixtures()) {
      const composed = compositeImageLayers(screenshot, fixture.scene.layers, {
        maxDimension: 1600,
      });
      const redaction = composed
        ? checkRedaction(composed, fixture.scene.layers, screenshot)
        : undefined;
      const fixtureScreenshot = composed ?? screenshot;
      const fixtureSize = composed
        ? { width: composed.width, height: composed.height }
        : screenshotSize;
      const fixtureCroppedSize =
        croppedImageSize(fixture.scene, fixtureSize) ?? fixtureSize;
      const output1 = computeOutputSize(fixture.scene, 1, fixtureCroppedSize);
      renderer.setAssets({
        screenshot: fixtureScreenshot,
        screenshotSize: fixtureSize,
        textLayers: await rasterizeTextLayers(fixture.scene, output1.width, 1),
      });
      const t1 = performance.now();
      renderer.render(fixture.scene, { scale: 1 });
      const ms1x = performance.now() - t1;
      const width = canvas.width;
      const height = canvas.height;

      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = width;
      previewCanvas.height = height;
      const previewCtx = previewCanvas.getContext("2d");
      if (!previewCtx) continue;
      previewCtx.drawImage(canvas, 0, 0);
      const previewData = previewCtx.getImageData(0, 0, width, height);

      const output2 = computeOutputSize(fixture.scene, 2, fixtureCroppedSize);
      renderer.setAssets({
        textLayers: await rasterizeTextLayers(fixture.scene, output2.width, 2),
      });
      const t2 = performance.now();
      renderer.render(fixture.scene, { scale: 2 });
      const ms2x = performance.now() - t2;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;
      exportCanvas.height = height;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) continue;
      exportCtx.drawImage(canvas, 0, 0, width, height);
      const exportData = exportCtx.getImageData(0, 0, width, height);

      const diff = compareImages(previewData, exportData);
      const result: FixtureResult = {
        id: fixture.id,
        label: fixture.label,
        status:
          diff.mean <= 4 && (!redaction || redaction.ok) ? "pass" : "fail",
        meanDiff: Number(diff.mean.toFixed(3)),
        maxDiff: diff.max,
        p99Diff: diff.p99,
        ms1x: Number(ms1x.toFixed(1)),
        ms2x: Number(ms2x.toFixed(1)),
        width,
        height,
        previewUrl: previewCanvas.toDataURL("image/png"),
        exportUrl: exportCanvas.toDataURL("image/png"),
        redaction,
      };
      collected.push(result);
      setResults([...collected]);
    }

    renderer.setAssets({ textLayers: [] });
    renderer.render(createDefaultScene(), { scale: 1 });
    window.__FIXTURE_RESULTS__ = { done: true, results: collected };
    setRunning(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void run();
    }, 0);
    return () => clearTimeout(timer);
  }, [run]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "ui-monospace, monospace",
        background: "#101014",
        color: "#e8e8ee",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>
        Renderer fixtures — T2.2 + T8.3 (preview vs export diff)
      </h1>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        Compare a 1x render with a downscaled 2x render. Mean pixel difference
        of 4 or less passes.
      </p>
      <button
        onClick={() => void run()}
        disabled={running}
        style={{
          padding: "6px 14px",
          marginBottom: 16,
          background: "#2a2a36",
          color: "#e8e8ee",
          border: "1px solid #444",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {running ? "running…" : "Re-run fixtures"}
      </button>
      <canvas
        ref={rendererCanvasRef}
        style={{ position: "fixed", left: -20000, top: 0 }}
      />
      <table
        style={{
          fontSize: 12,
          borderCollapse: "collapse",
          width: "100%",
          maxWidth: 1100,
          marginBottom: 24,
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.7 }}>
            <th style={{ padding: "4px 8px" }}>status</th>
            <th style={{ padding: "4px 8px" }}>fixture</th>
            <th style={{ padding: "4px 8px" }}>privacy</th>
            <th style={{ padding: "4px 8px" }}>mean</th>
            <th style={{ padding: "4px 8px" }}>p99</th>
            <th style={{ padding: "4px 8px" }}>max</th>
            <th style={{ padding: "4px 8px" }}>1× ms</th>
            <th style={{ padding: "4px 8px" }}>2× ms</th>
            <th style={{ padding: "4px 8px" }}>size</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id} style={{ borderBottom: "1px solid #26262e" }}>
              <td
                style={{
                  padding: "4px 8px",
                  color: result.status === "pass" ? "#5ddb7d" : "#ff6b6b",
                }}
              >
                {result.status}
              </td>
              <td style={{ padding: "4px 8px" }}>{result.label}</td>
              <td
                style={{ padding: "4px 8px" }}
                title={result.redaction?.detail}
              >
                {result.redaction ? (result.redaction.ok ? "✓" : "✗") : "—"}
              </td>
              <td style={{ padding: "4px 8px" }}>{result.meanDiff}</td>
              <td style={{ padding: "4px 8px" }}>{result.p99Diff}</td>
              <td style={{ padding: "4px 8px" }}>{result.maxDiff}</td>
              <td style={{ padding: "4px 8px" }}>{result.ms1x}</td>
              <td style={{ padding: "4px 8px" }}>{result.ms2x}</td>
              <td style={{ padding: "4px 8px" }}>
                {result.width}×{result.height}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {results.map((result) => (
          <figure key={result.id} style={{ margin: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <img
                src={result.previewUrl}
                alt={`${result.label} 1x`}
                width={result.width / 2}
              />
              <img
                src={result.exportUrl}
                alt={`${result.label} 2x`}
                width={result.width / 2}
              />
            </div>
            <figcaption style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
              {result.label} — 1× (left) vs 2× downscaled (right)
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
