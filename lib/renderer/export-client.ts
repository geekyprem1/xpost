import { createSunlightOverlayCanvas } from "@/lib/editor/sunlight-overlays";
import type { Scene } from "@/lib/scene";
import {
  loadImage,
  loadVideoFrame,
  type ExportImageAssets,
  type ExportImageOptions,
  type ExportImageResult,
} from "./export";
import { exportImage } from "./export";
import type {
  BakedAssets,
  ExportWorkerMessage,
  ExportWorkerRequest,
  GifExportOptions,
  VideoExportOptions,
} from "./export-protocol";
import { createWatermarkCanvas } from "./watermark";

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}

export type ExportPhase = "assets" | "init" | "decode" | "render" | "encode";

export type ExportProgress = {
  phase: ExportPhase;
  frame?: number;
  total?: number;
};

export type ExportProgressHooks = {
  onProgress?: (progress: ExportProgress) => void;
};

export type ExportResult = ExportImageResult & {
  via: "worker" | "main";
  frames?: number;
  durationSeconds?: number;
};

export type ExportHandle = {
  promise: Promise<ExportResult>;
  cancel: () => void;
};

export type ExportClientDeps = {
  supported?: () => boolean;
  supportedVideo?: () => Promise<boolean>;
  createWorker?: () => Worker;
  bakeAssets?: (
    scene: Scene,
    assets: ExportImageAssets,
  ) => Promise<BakedAssets>;
  runMain?: typeof exportImage;
};

const EXPORT_ID = 1;

type RunnerState = {
  cancelled: boolean;
  rejectCancel: ((reason: unknown) => void) | null;
  worker: Worker | null;
};

export function workerExportSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  );
}

export async function videoExportSupported(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    const { canEncodeVideo } = await import("mediabunny");
    return await canEncodeVideo("avc", {
      width: 1280,
      height: 720,
      frameRate: 30,
    });
  } catch {
    return false;
  }
}

async function bakeAssets(
  scene: Scene,
  assets: ExportImageAssets,
): Promise<BakedAssets> {
  await document.fonts.ready;
  const baked: BakedAssets = {
    watermark: await createImageBitmap(createWatermarkCanvas()),
  };
  if (assets.screenshot) {
    baked.screenshot = await createImageBitmap(assets.screenshot);
  }
  if (scene.sunlight.overlay !== "none") {
    baked.sunlightOverlay = await createImageBitmap(
      createSunlightOverlayCanvas(scene.sunlight.overlay),
    );
  }
  if (scene.background.kind === "image") {
    try {
      const image = await loadImage(scene.background.src.url);
      baked.backgroundImage = await createImageBitmap(image);
    } catch {
      baked.backgroundImage = null;
    }
  }
  if (scene.background.kind === "video") {
    const frame = await loadVideoFrame(
      scene.background.src.url,
      scene.background.src.previewUrl ?? null,
    );
    if (frame) {
      baked.videoFrame = await createImageBitmap(
        frame.source as HTMLImageElement | HTMLVideoElement,
      );
      baked.videoAspect = frame.aspect;
    }
  }
  return baked;
}

function transferables(baked: BakedAssets): Transferable[] {
  const transfer: Transferable[] = [];
  for (const candidate of [
    baked.screenshot,
    baked.backgroundImage,
    baked.videoFrame,
    baked.sunlightOverlay,
    baked.watermark,
  ]) {
    if (candidate) transfer.push(candidate);
  }
  return transfer;
}

function workerRoundTrip(
  worker: Worker,
  request: ExportWorkerRequest,
  transfer: Transferable[],
  hooks: ExportProgressHooks,
): Promise<Extract<ExportWorkerMessage, { type: "done" }>> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<ExportWorkerMessage>) => {
      const data = event.data;
      if (data.id !== request.id) return;
      if (data.type === "progress") {
        hooks.onProgress?.({
          phase: data.phase,
          frame: data.frame,
          total: data.total,
        });
        return;
      }
      if (data.type === "done") resolve(data);
      else if (data.type === "cancelled") reject(new ExportCancelledError());
      else reject(new Error(data.message));
    };
    const onError = (event: ErrorEvent) => {
      reject(new Error(event.message || "Export worker error"));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(request, transfer);
  });
}

function buildHandle(
  state: RunnerState,
  work: () => Promise<ExportResult>,
): ExportHandle {
  const cancellation = new Promise<never>((_, reject) => {
    state.rejectCancel = reject;
  });
  const promise = Promise.race([work(), cancellation]).finally(() => {
    state.worker?.terminate();
  });
  return {
    promise,
    cancel: () => {
      if (state.cancelled) return;
      state.cancelled = true;
      try {
        state.worker?.postMessage({ id: EXPORT_ID, type: "cancel" });
      } catch {
        // worker already gone
      }
      state.rejectCancel?.(new ExportCancelledError());
    },
  };
}

export function startImageExport(
  scene: Scene,
  assets: ExportImageAssets,
  options: ExportImageOptions,
  hooks: ExportProgressHooks = {},
  deps: ExportClientDeps = {},
): ExportHandle {
  const state: RunnerState = {
    cancelled: false,
    rejectCancel: null,
    worker: null,
  };
  const work = async (): Promise<ExportResult> => {
    const supported = (deps.supported ?? workerExportSupported)();
    if (!supported) {
      hooks.onProgress?.({ phase: "assets" });
      const result = await (deps.runMain ?? exportImage)(
        scene,
        assets,
        options,
      );
      return { ...result, via: "main" };
    }
    hooks.onProgress?.({ phase: "assets" });
    const baked = await (deps.bakeAssets ?? bakeAssets)(scene, assets);
    if (state.cancelled) throw new ExportCancelledError();
    const worker = (deps.createWorker ?? defaultCreateWorker)();
    state.worker = worker;
    const message = await workerRoundTrip(
      worker,
      { kind: "image", id: EXPORT_ID, scene, assets: baked, options },
      transferables(baked),
      hooks,
    );
    return {
      blob: message.blob,
      width: message.width,
      height: message.height,
      ms: message.ms,
      via: "worker",
    };
  };
  return buildHandle(state, work);
}

export function startVideoExport(
  scene: Scene,
  assets: ExportImageAssets,
  options: VideoExportOptions,
  hooks: ExportProgressHooks = {},
  deps: ExportClientDeps = {},
): ExportHandle {
  const state: RunnerState = {
    cancelled: false,
    rejectCancel: null,
    worker: null,
  };
  const work = async (): Promise<ExportResult> => {
    const check = deps.supportedVideo ?? videoExportSupported;
    const supported = await check();
    if (!supported) {
      throw new Error(
        "Video export is unsupported in this browser. Use a recent version of Chrome, Edge or Safari.",
      );
    }
    hooks.onProgress?.({ phase: "assets" });
    const baked = await (deps.bakeAssets ?? bakeAssets)(scene, assets);
    if (state.cancelled) throw new ExportCancelledError();
    const worker = (deps.createWorker ?? defaultCreateWorker)();
    state.worker = worker;
    const message = await workerRoundTrip(
      worker,
      { kind: "video", id: EXPORT_ID, scene, assets: baked, options },
      transferables(baked),
      hooks,
    );
    return {
      blob: message.blob,
      width: message.width,
      height: message.height,
      ms: message.ms,
      via: "worker",
      frames: message.frames,
      durationSeconds: message.durationSeconds,
    };
  };
  return buildHandle(state, work);
}

export function startGifExport(
  scene: Scene,
  assets: ExportImageAssets,
  options: GifExportOptions,
  hooks: ExportProgressHooks = {},
  deps: ExportClientDeps = {},
): ExportHandle {
  const state: RunnerState = {
    cancelled: false,
    rejectCancel: null,
    worker: null,
  };
  const work = async (): Promise<ExportResult> => {
    const supported = (deps.supported ?? workerExportSupported)();
    if (!supported) {
      throw new Error(
        "GIF export is unsupported in this browser. Try a recent browser.",
      );
    }
    hooks.onProgress?.({ phase: "assets" });
    const baked = await (deps.bakeAssets ?? bakeAssets)(scene, assets);
    if (state.cancelled) throw new ExportCancelledError();
    const worker = (deps.createWorker ?? defaultCreateWorker)();
    state.worker = worker;
    const message = await workerRoundTrip(
      worker,
      { kind: "gif", id: EXPORT_ID, scene, assets: baked, options },
      transferables(baked),
      hooks,
    );
    return {
      blob: message.blob,
      width: message.width,
      height: message.height,
      ms: message.ms,
      via: "worker",
      frames: message.frames,
      durationSeconds: message.durationSeconds,
    };
  };
  return buildHandle(state, work);
}

function defaultCreateWorker(): Worker {
  return new Worker(new URL("./export.worker.ts", import.meta.url));
}
