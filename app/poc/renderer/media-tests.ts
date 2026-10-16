import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  UrlSource,
  VideoSampleSink,
  WebMOutputFormat,
} from "mediabunny";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { MP4_TEST, POC_SCENE } from "./poc-scene";
import type { GlPocRenderer } from "./gl-renderer";

export type TestResult = {
  id: string;
  label: string;
  status: "pass" | "fail" | "skip";
  ms?: number;
  detail?: string;
  data?: Record<string, unknown>;
  url?: string;
};

export async function checkCodecSupport(): Promise<TestResult[]> {
  const out: TestResult[] = [];
  const hasVE = typeof VideoEncoder !== "undefined";
  out.push({
    id: "webcodecs-encoder",
    label: "WebCodecs VideoEncoder present",
    status: hasVE ? "pass" : "fail",
    detail: hasVE ? "yes" : "missing",
  });
  if (hasVE) {
    const candidates = [
      { id: "enc-h264", label: "Encode H.264", codec: "avc1.42001f" },
      { id: "enc-vp8", label: "Encode VP8", codec: "vp8" },
    ];
    for (const c of candidates) {
      try {
        const res = await VideoEncoder.isConfigSupported({
          codec: c.codec,
          width: MP4_TEST.width,
          height: MP4_TEST.height,
          bitrate: 6_000_000,
          framerate: MP4_TEST.fps,
        });
        out.push({
          id: c.id,
          label: c.label,
          status: res.supported ? "pass" : "fail",
          detail: res.supported ? "supported" : "not supported",
        });
      } catch (e) {
        out.push({ id: c.id, label: c.label, status: "fail", detail: String(e) });
      }
    }
  }
  const hasVD = typeof VideoDecoder !== "undefined";
  out.push({
    id: "webcodecs-decoder",
    label: "WebCodecs VideoDecoder present",
    status: hasVD ? "pass" : "fail",
    detail: hasVD ? "yes" : "missing",
  });
  if (hasVD) {
    try {
      const res = await VideoDecoder.isConfigSupported({
        codec: "avc1.42E01E",
        codedWidth: 1920,
        codedHeight: 1080,
      });
      out.push({
        id: "dec-h264",
        label: "Decode H.264",
        status: res.supported ? "pass" : "fail",
        detail: res.supported ? "supported" : "not supported",
      });
    } catch (e) {
      out.push({ id: "dec-h264", label: "Decode H.264", status: "fail", detail: String(e) });
    }
  }
  return out;
}

export type FrameProvider = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  drawAt: (t: number) => Promise<boolean>;
};

export async function createVideoFrameProvider(
  videoUrl: string,
  width: number,
  height: number
): Promise<FrameProvider> {
  const input = new Input({ source: new UrlSource(videoUrl), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("no primary video track");
  const sink = new VideoSampleSink(track);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  let last: Awaited<ReturnType<typeof sink.getSample>> = null;
  return {
    canvas,
    width,
    height,
    drawAt: async (t: number) => {
      const fresh = await sink.getSample(t);
      if (fresh) {
        if (last) last.close();
        last = fresh;
      }
      if (!last) return false;
      last.draw(ctx, 0, 0, width, height);
      return true;
    },
  };
}

export async function runVideoEncodeTest(opts: {
  renderer: GlPocRenderer;
  provider: FrameProvider | null;
  codec: "avc" | "vp8";
  fps: number;
  durationSec: number;
  width: number;
  height: number;
  label: string;
}): Promise<TestResult> {
  const { renderer, provider, codec, fps, durationSec, width, height } = opts;
  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context for output");
  const format = codec === "avc" ? new Mp4OutputFormat() : new WebMOutputFormat();
  const output = new Output({ format, target: new BufferTarget() });
  const source = new CanvasSource(outCanvas, { codec, quality: new Quality("high") });
  output.addVideoTrack(source);
  await output.start();
  const t0 = performance.now();
  const total = Math.round(fps * durationSec);
  const scale = width / POC_SCENE.baseW;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    if (provider) {
      const ok = await provider.drawAt(t);
      if (ok) renderer.setVideoFrame(provider.canvas, provider.width / provider.height);
    }
    renderer.render(scale, {
      background: provider ? "video" : "gradient",
      glass: false,
      tilt: false,
    });
    ctx.drawImage(renderer.canvas, 0, 0, width, height);
    await source.add(t, 1 / fps);
  }
  await output.finalize();
  const ms = performance.now() - t0;
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("no output buffer");
  const blob = new Blob([buffer], { type: codec === "avc" ? "video/mp4" : "video/webm" });
  const check = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const duration = await check.computeDuration();
  const vt = await check.getPrimaryVideoTrack();
  const vw = vt ? await vt.getDisplayWidth() : 0;
  const vh = vt ? await vt.getDisplayHeight() : 0;
  return {
    id: `video-encode-${codec}`,
    label: opts.label,
    status: "pass",
    ms,
    detail: `${total} frames @ ${fps}fps — ${(blob.size / 1024 / 1024).toFixed(2)} MB, decoded back: ${duration.toFixed(2)}s ${vw}x${vh}`,
    data: { bytes: blob.size, frames: total, duration, width: vw, height: vh },
    url: URL.createObjectURL(blob),
  };
}

export async function runGifTest(opts: {
  renderer: GlPocRenderer;
  provider: FrameProvider | null;
  fps: number;
  durationSec: number;
  width: number;
  height: number;
}): Promise<TestResult> {
  const { renderer, provider, fps, durationSec, width, height } = opts;
  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context for output");
  const gif = GIFEncoder();
  const t0 = performance.now();
  const total = Math.round(fps * durationSec);
  const scale = width / POC_SCENE.baseW;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    if (provider) {
      const ok = await provider.drawAt(t);
      if (ok) renderer.setVideoFrame(provider.canvas, provider.width / provider.height);
    }
    renderer.render(scale, {
      background: provider ? "video" : "gradient",
      glass: false,
      tilt: false,
    });
    ctx.drawImage(renderer.canvas, 0, 0, width, height);
    const img = ctx.getImageData(0, 0, width, height);
    const palette = quantize(img.data, 256);
    const index = applyPalette(img.data, palette);
    gif.writeFrame(index, width, height, { palette, delay: 1000 / fps });
  }
  gif.finish();
  const ms = performance.now() - t0;
  const bytes = gif.bytes();
  const blob = new Blob([bytes.slice()], { type: "image/gif" });
  return {
    id: "gif",
    label: `GIF ${durationSec}s @ ${fps}fps (gifenc)`,
    status: "pass",
    ms,
    detail: `${total} frames — ${(blob.size / 1024).toFixed(0)} KB`,
    data: { bytes: blob.size, frames: total },
    url: URL.createObjectURL(blob),
  };
}
