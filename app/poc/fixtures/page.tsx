"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDefaultScene, type Scene } from "@/lib/scene";
import { createWatermarkCanvas, WebGL2Renderer } from "@/lib/renderer";

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

  return [
    { id: "shadow", label: "Gradient + shadow + rounded", scene: shadow },
    { id: "glass-tilt", label: "Glass + perspective tilt", scene: glassTilt },
    {
      id: "sunlight-grain",
      label: "Sunlight + grain + border",
      scene: sunlightGrain,
    },
    { id: "minimal", label: "Sharp + no shadow + watermark", scene: minimal },
  ];
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
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const canvas = rendererCanvasRef.current;
    if (!canvas) return;
    const renderer = new WebGL2Renderer();
    await renderer.init(canvas);
    await document.fonts.ready;
    renderer.setAssets({
      screenshot: makeScreenshotCanvas(),
      screenshotSize: { width: 1600, height: 1000 },
      watermark: createWatermarkCanvas(),
    });

    const collected: FixtureResult[] = [];
    for (const fixture of buildFixtures()) {
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
        status: diff.mean <= 4 ? "pass" : "fail",
        meanDiff: Number(diff.mean.toFixed(3)),
        maxDiff: diff.max,
        p99Diff: diff.p99,
        ms1x: Number(ms1x.toFixed(1)),
        ms2x: Number(ms2x.toFixed(1)),
        width,
        height,
        previewUrl: previewCanvas.toDataURL("image/png"),
        exportUrl: exportCanvas.toDataURL("image/png"),
      };
      collected.push(result);
      setResults([...collected]);
    }

    renderer.render(createDefaultScene(), { scale: 1 });
    window.__FIXTURE_RESULTS__ = { done: true, results: collected };
    setRunning(false);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
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
        Renderer fixtures — T2.2 (preview vs export diff)
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
