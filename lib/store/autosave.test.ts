import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultScene, type Scene } from "@/lib/scene";
import { createAutosave } from "./autosave";

describe("autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounce ke baad ek save hota hai", async () => {
    const save = vi.fn(async () => undefined);
    const autosave = createAutosave({ save, debounceMs: 2000 });
    const scene = createDefaultScene();

    autosave.schedule(scene);
    expect(autosave.getStatus()).toBe("dirty");

    await vi.advanceTimersByTimeAsync(1999);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(scene);
    expect(autosave.getStatus()).toBe("saved");

    autosave.dispose();
  });

  it("rapid changes coalesce hote hain (sirf last scene save hoti hai)", async () => {
    const save = vi.fn(async () => undefined);
    const autosave = createAutosave({ save, debounceMs: 2000 });

    autosave.schedule(createDefaultScene());
    await vi.advanceTimersByTimeAsync(1000);
    const latest = createDefaultScene();
    autosave.schedule(latest);
    await vi.advanceTimersByTimeAsync(2000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(latest);

    autosave.dispose();
  });

  it("fail pe error status aur auto-retry ke baad save hota hai", async () => {
    const save = vi.fn<(scene: Scene) => Promise<void>>();
    save.mockRejectedValueOnce(new Error("network down"));
    save.mockResolvedValue(undefined);
    const autosave = createAutosave({ save, debounceMs: 2000, retryDelayMs: 5000 });

    autosave.schedule(createDefaultScene());
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.getStatus()).toBe("error");

    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.getStatus()).toBe("saved");

    autosave.dispose();
  });

  it("save ke dauran aaya change turant dobara save hota hai", async () => {
    let release: () => void = () => undefined;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = vi.fn<(scene: Scene) => Promise<void>>().mockReturnValueOnce(first);
    save.mockResolvedValue(undefined);
    const autosave = createAutosave({ save, debounceMs: 2000 });

    const sceneA = createDefaultScene();
    const sceneB = createDefaultScene();
    autosave.schedule(sceneA);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);

    autosave.schedule(sceneB);
    release();
    await vi.advanceTimersByTimeAsync(1);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(sceneB);
    expect(autosave.getStatus()).toBe("saved");

    autosave.dispose();
  });

  it("status listeners ko notify karta hai", async () => {
    const save = vi.fn(async () => undefined);
    const autosave = createAutosave({ save, debounceMs: 2000 });
    const statuses: string[] = [];
    autosave.subscribe((status) => statuses.push(status));

    autosave.schedule(createDefaultScene());
    await vi.advanceTimersByTimeAsync(2000);

    expect(statuses).toEqual(["dirty", "saving", "saved"]);

    autosave.dispose();
  });

  it("dispose ke baad save nahi hota", async () => {
    const save = vi.fn(async () => undefined);
    const autosave = createAutosave({ save, debounceMs: 2000 });

    autosave.schedule(createDefaultScene());
    autosave.dispose();
    await vi.advanceTimersByTimeAsync(5000);

    expect(save).not.toHaveBeenCalled();
  });
});
