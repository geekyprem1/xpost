import { describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  ExportCancelledError,
  startGifExport,
  startImageExport,
  startVideoExport,
} from "./export-client";
import type { BakedAssets } from "./export-protocol";

class FakeWorker {
  posted: Array<{ message: unknown; transfer?: Transferable[] }> = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  postMessage(message: unknown, transfer?: Transferable[]) {
    this.posted.push({ message, transfer });
  }

  addEventListener(type: string, handler: (event: unknown) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: (event: unknown) => void) {
    this.listeners.get(type)?.delete(handler);
  }

  terminate() {
    this.terminated = true;
  }

  emit(data: unknown) {
    for (const handler of this.listeners.get("message") ?? []) {
      handler({ data });
    }
  }

  emitError(message: string) {
    for (const handler of this.listeners.get("error") ?? []) {
      handler({ message });
    }
  }
}

const scene = createDefaultScene();

function makeBaked(): BakedAssets {
  return {
    screenshot: {} as ImageBitmap,
    watermark: {} as ImageBitmap,
  };
}

function deps(worker: FakeWorker, overrides: Record<string, unknown> = {}) {
  return {
    supported: () => true,
    supportedVideo: async () => true,
    createWorker: () => worker as unknown as Worker,
    bakeAssets: async () => makeBaked(),
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const VIDEO_OPTIONS = {
  fps: 30,
  maxWidth: 1280,
  maxHeight: 1024,
  bitrate: 6_000_000,
};

describe("startImageExport (worker client)", () => {
  it("progress phases + done resolve, worker terminate + transferables", async () => {
    const worker = new FakeWorker();
    const phases: string[] = [];
    const handle = startImageExport(
      scene,
      {},
      { format: "png", scale: 2 },
      { onProgress: (progress) => phases.push(progress.phase) },
      deps(worker)
    );
    await flush();
    expect(worker.posted).toHaveLength(1);
    expect((worker.posted[0].message as { kind?: string }).kind).toBe("image");
    expect(worker.posted[0].transfer).toHaveLength(2);

    worker.emit({ id: 1, type: "progress", phase: "init" });
    worker.emit({ id: 1, type: "progress", phase: "render" });
    worker.emit({
      id: 1,
      type: "done",
      blob: new Blob(["x"]),
      width: 3000,
      height: 1875,
      ms: 120,
    });

    const result = await handle.promise;
    expect(result.via).toBe("worker");
    expect(result.width).toBe(3000);
    expect(result.height).toBe(1875);
    expect(phases).toEqual(["assets", "init", "render"]);
    expect(worker.terminated).toBe(true);
  });

  it("cancel: promise reject + worker ko cancel message + terminate", async () => {
    const worker = new FakeWorker();
    const handle = startImageExport(
      scene,
      {},
      { format: "png", scale: 2 },
      {},
      deps(worker)
    );
    await flush();
    handle.cancel();
    await expect(handle.promise).rejects.toBeInstanceOf(ExportCancelledError);
    expect(
      worker.posted.some((entry) => (entry.message as { type?: string }).type === "cancel")
    ).toBe(true);
    expect(worker.terminated).toBe(true);
  });

  it("cancel bake ke dauraan bhi kaam karta hai", async () => {
    const worker = new FakeWorker();
    let releaseBake: () => void = () => {};
    const handle = startImageExport(
      scene,
      {},
      { format: "png", scale: 2 },
      {},
      deps(worker, {
        bakeAssets: () =>
          new Promise<BakedAssets>((resolve) => {
            releaseBake = () => resolve(makeBaked());
          }),
      })
    );
    handle.cancel();
    releaseBake();
    await expect(handle.promise).rejects.toBeInstanceOf(ExportCancelledError);
    expect(worker.posted).toHaveLength(0);
  });

  it("worker error message reject hota hai", async () => {
    const worker = new FakeWorker();
    const handle = startImageExport(
      scene,
      {},
      { format: "png", scale: 2 },
      {},
      deps(worker)
    );
    await flush();
    worker.emit({ id: 1, type: "error", message: "encode fail" });
    await expect(handle.promise).rejects.toThrow("encode fail");
    expect(worker.terminated).toBe(true);
  });

  it("worker runtime error event reject hota hai", async () => {
    const worker = new FakeWorker();
    const handle = startImageExport(
      scene,
      {},
      { format: "png", scale: 2 },
      {},
      deps(worker)
    );
    await flush();
    worker.emitError("worker crash");
    await expect(handle.promise).rejects.toThrow("worker crash");
  });

  it("unsupported pe main-thread fallback chalta hai", async () => {
    const runMain = vi.fn(async () => ({
      blob: new Blob(["main"]),
      width: 1500,
      height: 938,
      ms: 42,
    }));
    const phases: string[] = [];
    const handle = startImageExport(
      scene,
      {},
      { format: "jpg", scale: 1 },
      { onProgress: (progress) => phases.push(progress.phase) },
      {
        supported: () => false,
        runMain: runMain as unknown as typeof import("./export").exportImage,
      }
    );
    const result = await handle.promise;
    expect(result.via).toBe("main");
    expect(result.ms).toBe(42);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(phases).toEqual(["assets"]);
  });
});

describe("startVideoExport", () => {
  it("supported: video request post hota hai, frame progress + done", async () => {
    const worker = new FakeWorker();
    const progress: Array<{ phase: string; frame?: number; total?: number }> = [];
    const handle = startVideoExport(
      scene,
      {},
      VIDEO_OPTIONS,
      { onProgress: (event) => progress.push(event) },
      deps(worker)
    );
    await flush();
    expect(worker.posted).toHaveLength(1);
    expect((worker.posted[0].message as { kind?: string }).kind).toBe("video");

    worker.emit({ id: 1, type: "progress", phase: "decode" });
    worker.emit({ id: 1, type: "progress", phase: "encode", frame: 30, total: 180 });
    worker.emit({
      id: 1,
      type: "done",
      blob: new Blob(["mp4"], { type: "video/mp4" }),
      width: 1280,
      height: 800,
      ms: 8400,
    });

    const result = await handle.promise;
    expect(result.via).toBe("worker");
    expect(result.blob.type).toBe("video/mp4");
    expect(result.width).toBe(1280);
    expect(progress).toEqual([
      { phase: "assets", frame: undefined, total: undefined },
      { phase: "decode", frame: undefined, total: undefined },
      { phase: "encode", frame: 30, total: 180 },
    ]);
    expect(worker.terminated).toBe(true);
  });

  it("unsupported encoder pe clear error", async () => {
    const handle = startVideoExport(
      scene,
      {},
      VIDEO_OPTIONS,
      {},
      deps(new FakeWorker(), { supportedVideo: async () => false })
    );
    await expect(handle.promise).rejects.toThrow(/unsupported/);
  });

  it("video export cancel hota hai", async () => {
    const worker = new FakeWorker();
    const handle = startVideoExport(
      scene,
      {},
      VIDEO_OPTIONS,
      {},
      deps(worker)
    );
    await flush();
    handle.cancel();
    await expect(handle.promise).rejects.toBeInstanceOf(ExportCancelledError);
    expect(worker.terminated).toBe(true);
  });
});

describe("startGifExport", () => {
  const GIF_OPTIONS = {
    fps: 15,
    maxWidth: 1280,
    maxHeight: 1080,
    maxFrames: 350,
  };

  it("gif request post + done resolve", async () => {
    const worker = new FakeWorker();
    const progress: Array<{ phase: string; frame?: number }> = [];
    const handle = startGifExport(
      scene,
      {},
      GIF_OPTIONS,
      { onProgress: (event) => progress.push({ phase: event.phase, frame: event.frame }) },
      deps(worker)
    );
    await flush();
    expect((worker.posted[0].message as { kind?: string }).kind).toBe("gif");
    worker.emit({ id: 1, type: "progress", phase: "encode", frame: 15, total: 90 });
    worker.emit({
      id: 1,
      type: "done",
      blob: new Blob(["gif"], { type: "image/gif" }),
      width: 1280,
      height: 800,
      ms: 5200,
    });
    const result = await handle.promise;
    expect(result.blob.type).toBe("image/gif");
    expect(result.via).toBe("worker");
    expect(progress).toEqual([
      { phase: "assets", frame: undefined },
      { phase: "encode", frame: 15 },
    ]);
    expect(worker.terminated).toBe(true);
  });

  it("worker support na ho to clear error", async () => {
    const handle = startGifExport(
      scene,
      {},
      GIF_OPTIONS,
      {},
      deps(new FakeWorker(), { supported: () => false })
    );
    await expect(handle.promise).rejects.toThrow(/unsupported/);
  });
});
