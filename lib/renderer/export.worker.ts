/// <reference lib="webworker" />
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import {
  ALL_FORMATS,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  UrlSource,
  VideoSampleSink,
  type VideoSample,
} from "mediabunny";
import { croppedImageSize } from "@/lib/scene";
import { computeOutputSize } from "./geometry";
import { exportMime } from "./export-format";
import { gifFrameDelayMs } from "./export-gif";
import { buildLoopTimestamps, computeVideoDuration } from "./export-video";
import { WebGL2Renderer } from "./renderer";
import type {
  BakedAssets,
  ExportWorkerCancel,
  ExportWorkerMessage,
  ExportWorkerRequest,
} from "./export-protocol";
import type { TextLayerAsset } from "./types";

type ImageRequest = Extract<ExportWorkerRequest, { kind: "image" }>;
type VideoRequest = Extract<ExportWorkerRequest, { kind: "video" }>;
type GifRequest = Extract<ExportWorkerRequest, { kind: "gif" }>;
type DoneMessage = Extract<ExportWorkerMessage, { type: "done" }>;

class CancelledError extends Error {}

// Chrome ImageBitmap ke liye UNPACK_FLIP_Y_WEBGL ignore karta hai, isliye worker ke
// andar bitmap ko canvas mein draw karte hain — canvas pe flip honored hota hai.
function canvasFrom(
  source: ImageBitmap | null | undefined,
): OffscreenCanvas | null {
  if (!source) return null;
  const canvas = new OffscreenCanvas(
    Math.max(1, source.width),
    Math.max(1, source.height),
  );
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a 2D rendering context");
  context.drawImage(source, 0, 0);
  return canvas;
}

function textLayersFrom(assets: BakedAssets): TextLayerAsset[] | undefined {
  if (!assets.textLayers) return undefined;
  const layers: TextLayerAsset[] = [];
  for (const item of assets.textLayers) {
    const source = canvasFrom(item.bitmap);
    if (!source) continue;
    layers.push({
      id: item.id,
      source,
      x: item.x,
      y: item.y,
      width: item.width,
      aspect: item.aspect,
      rotation: item.rotation,
      opacity: item.opacity,
    });
  }
  return layers;
}

const cancelled = new Set<number>();
const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: ExportWorkerMessage, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

scope.onmessage = (
  event: MessageEvent<ExportWorkerRequest | ExportWorkerCancel>,
) => {
  const message = event.data;
  if ("kind" in message) {
    if (message.kind === "video") {
      void runVideo(message);
    } else if (message.kind === "gif") {
      void runGif(message);
    } else {
      void runImage(message);
    }
    return;
  }
  cancelled.add(message.id);
};

function drawSampleFrame(
  sample: VideoSample,
  frameCanvas: OffscreenCanvas,
  frameContext: OffscreenCanvasRenderingContext2D,
): { width: number; height: number } {
  const width = sample.displayWidth || 16;
  const height = sample.displayHeight || 16;
  if (frameCanvas.width !== width || frameCanvas.height !== height) {
    frameCanvas.width = width;
    frameCanvas.height = height;
  }
  frameContext.clearRect(0, 0, width, height);
  sample.draw(frameContext, 0, 0, width, height);
  return { width, height };
}

function done(
  id: number,
  blob: Blob,
  width: number,
  height: number,
  started: number,
  extras: { frames?: number; durationSeconds?: number } = {},
) {
  post({
    id,
    type: "done",
    blob,
    width,
    height,
    ms: performance.now() - started,
    ...extras,
  } satisfies DoneMessage);
}

async function runImage(request: ImageRequest) {
  const { id, scene, assets, options } = request;
  const started = performance.now();
  const check = () => {
    if (cancelled.has(id)) throw new CancelledError();
  };
  const renderer = new WebGL2Renderer();
  try {
    post({ id, type: "progress", phase: "init" });
    const screenshot = canvasFrom(assets.screenshot);
    const screenshotSize = screenshot
      ? { width: screenshot.width, height: screenshot.height }
      : null;
    const output = computeOutputSize(
      scene,
      options.scale,
      croppedImageSize(scene, screenshotSize),
    );
    const canvas = new OffscreenCanvas(output.width, output.height);
    await renderer.init(canvas);
    check();
    renderer.setAssets({
      screenshot,
      screenshotSize,
      backgroundImage: canvasFrom(assets.backgroundImage),
      videoFrame: canvasFrom(assets.videoFrame),
      videoAspect: assets.videoAspect ?? null,
      sunlightOverlay: canvasFrom(assets.sunlightOverlay),
      watermark: canvasFrom(assets.watermark),
      textLayers: textLayersFrom(assets),
    });
    check();
    post({ id, type: "progress", phase: "render" });
    renderer.render(scene, { scale: output.width / scene.canvas.baseWidth });
    check();
    post({ id, type: "progress", phase: "encode" });
    const blob = await canvas.convertToBlob({
      type: exportMime(options.format),
      quality: options.format === "png" ? undefined : (options.quality ?? 0.92),
    });
    check();
    done(id, blob, output.width, output.height, started);
  } catch (error) {
    reportError(id, error);
  } finally {
    renderer.dispose();
    cancelled.delete(id);
  }
}

async function runVideo(request: VideoRequest) {
  const { id, scene, assets, options } = request;
  const started = performance.now();
  const check = () => {
    if (cancelled.has(id)) throw new CancelledError();
  };
  const renderer = new WebGL2Renderer();
  let input: Input | null = null;
  try {
    if (scene.background.kind !== "video") {
      throw new Error("Video export requires a motion background");
    }
    post({ id, type: "progress", phase: "decode" });

    input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(scene.background.src.url),
    });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("No video track found");
    const sourceDuration = await input.computeDuration();
    const duration = computeVideoDuration(sourceDuration);
    const timestamps = buildLoopTimestamps(
      duration,
      options.fps,
      sourceDuration,
    );

    const screenshot = canvasFrom(assets.screenshot);
    const screenshotSize = screenshot
      ? { width: screenshot.width, height: screenshot.height }
      : null;
    const full = computeOutputSize(
      scene,
      1,
      croppedImageSize(scene, screenshotSize),
    );
    const scale = Math.min(
      1,
      options.maxWidth / Math.max(1, full.width),
      options.maxHeight / Math.max(1, full.height),
    );
    const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
    const width = even(full.width * scale);
    const height = even(full.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    await renderer.init(canvas);
    check();
    renderer.setAssets({
      screenshot,
      screenshotSize,
      sunlightOverlay: canvasFrom(assets.sunlightOverlay),
      watermark: canvasFrom(assets.watermark),
      textLayers: textLayersFrom(assets),
    });

    const muxer = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
    const videoSource = new CanvasSource(canvas, {
      codec: "avc",
      bitrate: options.bitrate,
    });
    muxer.addVideoTrack(videoSource);
    await muxer.start();
    check();

    const sink = new VideoSampleSink(track);
    const frameCanvas = new OffscreenCanvas(16, 16);
    const frameContext = frameCanvas.getContext("2d");
    if (!frameContext)
      throw new Error("Unable to create a 2D rendering context");
    const frameDuration = 1 / options.fps;
    const total = timestamps.length;
    let index = 0;

    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      check();
      if (sample) {
        const dims = drawSampleFrame(sample, frameCanvas, frameContext);
        renderer.setAssets({
          videoFrame: frameCanvas,
          videoAspect: dims.width / Math.max(1, dims.height),
        });
        sample.close();
      }
      post({ id, type: "progress", phase: "render" });
      renderer.render(scene, { scale: width / scene.canvas.baseWidth });
      await videoSource.add(index * frameDuration, frameDuration);
      index++;
      if (index % 5 === 0 || index === total) {
        post({ id, type: "progress", phase: "encode", frame: index, total });
      }
    }

    await muxer.finalize();
    check();
    const buffer = muxer.target.buffer;
    if (!buffer) throw new Error("The MP4 output is empty");
    done(
      id,
      new Blob([buffer], { type: "video/mp4" }),
      width,
      height,
      started,
      {
        frames: index,
        durationSeconds: duration,
      },
    );
  } catch (error) {
    reportError(id, error);
  } finally {
    renderer.dispose();
    try {
      input?.dispose();
    } catch {
      // already disposed
    }
    cancelled.delete(id);
  }
}

async function runGif(request: GifRequest) {
  const { id, scene, assets, options } = request;
  const started = performance.now();
  const check = () => {
    if (cancelled.has(id)) throw new CancelledError();
  };
  const renderer = new WebGL2Renderer();
  let input: Input | null = null;
  try {
    if (scene.background.kind !== "video") {
      throw new Error("GIF export requires a motion background");
    }
    post({ id, type: "progress", phase: "decode" });

    input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(scene.background.src.url),
    });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("No video track found");
    const sourceDuration = await input.computeDuration();
    const duration =
      options.durationSeconds ?? computeVideoDuration(sourceDuration);
    const timestamps = buildLoopTimestamps(
      duration,
      options.fps,
      sourceDuration,
    ).slice(0, options.maxFrames);

    const screenshot = canvasFrom(assets.screenshot);
    const screenshotSize = screenshot
      ? { width: screenshot.width, height: screenshot.height }
      : null;
    const full = computeOutputSize(
      scene,
      1,
      croppedImageSize(scene, screenshotSize),
    );
    const scale = Math.min(
      1,
      options.maxWidth / Math.max(1, full.width),
      options.maxHeight / Math.max(1, full.height),
    );
    const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
    const width = even(full.width * scale);
    const height = even(full.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    await renderer.init(canvas);
    check();
    renderer.setAssets({
      screenshot,
      screenshotSize,
      sunlightOverlay: canvasFrom(assets.sunlightOverlay),
      watermark: canvasFrom(assets.watermark),
      textLayers: textLayersFrom(assets),
    });

    const readCanvas = new OffscreenCanvas(width, height);
    const readContext = readCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!readContext)
      throw new Error("Unable to create a 2D rendering context");

    const gif = GIFEncoder();
    const delay = gifFrameDelayMs(options.fps);
    const sink = new VideoSampleSink(track);
    const frameCanvas = new OffscreenCanvas(16, 16);
    const frameContext = frameCanvas.getContext("2d");
    if (!frameContext)
      throw new Error("Unable to create a 2D rendering context");
    const total = timestamps.length;
    let index = 0;

    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      check();
      if (sample) {
        const dims = drawSampleFrame(sample, frameCanvas, frameContext);
        renderer.setAssets({
          videoFrame: frameCanvas,
          videoAspect: dims.width / Math.max(1, dims.height),
        });
        sample.close();
      }
      renderer.render(scene, { scale: width / scene.canvas.baseWidth });
      readContext.clearRect(0, 0, width, height);
      readContext.drawImage(canvas, 0, 0);
      const rgba = readContext.getImageData(0, 0, width, height).data;
      const palette = quantize(rgba, 256, { format: "rgb565" });
      const indexed = applyPalette(rgba, palette, "rgb565");
      gif.writeFrame(
        indexed,
        width,
        height,
        index === 0 ? { palette, delay, repeat: 0 } : { palette, delay },
      );
      index++;
      if (index % 5 === 0 || index === total) {
        post({ id, type: "progress", phase: "encode", frame: index, total });
      }
    }

    gif.finish();
    check();
    const bytes = gif.bytes();
    if (bytes.length === 0) throw new Error("The GIF output is empty");
    done(
      id,
      new Blob([new Uint8Array(bytes)], { type: "image/gif" }),
      width,
      height,
      started,
      { frames: index, durationSeconds: duration },
    );
  } catch (error) {
    reportError(id, error);
  } finally {
    renderer.dispose();
    try {
      input?.dispose();
    } catch {
      // already disposed
    }
    cancelled.delete(id);
  }
}

function reportError(id: number, error: unknown) {
  if (error instanceof CancelledError) {
    post({ id, type: "cancelled" });
  } else {
    post({
      id,
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
