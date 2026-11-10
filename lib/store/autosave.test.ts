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
    const autosave = createAutosave({
      save,
      debounceMs: 2000,
      retryDelayMs: 5000,
    });

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
    const save = vi
      .fn<(scene: Scene) => Promise<void>>()
      .mockReturnValueOnce(first);
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

  it("navigation cleanup waits for the active save and the latest pending edit", async () => {
    let finishFirst!: () => void;
    let finishLatest!: () => void;
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const latest = new Promise<void>((resolve) => {
      finishLatest = resolve;
    });
    const save = vi
      .fn<(value: number) => Promise<void>>()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(latest)
      .mockResolvedValue(undefined);
    const autosave = createAutosave({ save });

    autosave.schedule(1);
    const saving = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);
    autosave.schedule(2);
    autosave.schedule(3);
    let cleanedUp = false;
    const cleanup = autosave.flush().finally(() => {
      cleanedUp = true;
      autosave.dispose();
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(cleanedUp).toBe(false);
    expect(save.mock.calls).toEqual([[1]]);

    finishFirst();
    await vi.advanceTimersByTimeAsync(0);
    expect(save.mock.calls).toEqual([[1], [3]]);
    expect(cleanedUp).toBe(false);
    finishLatest();
    await Promise.all([saving, cleanup]);
    expect(cleanedUp).toBe(true);
    expect(autosave.getStatus()).toBe("saved");
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(2);
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

describe("autosave retry rules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shouldRetry false → error pe ruk jaata hai, onError milta hai", async () => {
    const failure = new Error("conflict");
    const save = vi.fn<(value: number) => Promise<void>>(async () => {
      throw failure;
    });
    const onError = vi.fn();
    const autosave = createAutosave<number>({
      save,
      debounceMs: 10,
      retryDelayMs: 50,
      shouldRetry: () => false,
      onError,
    });
    autosave.schedule(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(autosave.getStatus()).toBe("error");
    expect(onError).toHaveBeenCalledWith(failure);
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);

    // Manual retry (user choice) phir se try karta hai.
    save.mockResolvedValueOnce(undefined);
    autosave.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.getStatus()).toBe("saved");
    autosave.dispose();
  });

  it("generic value (snapshot) save fn tak pahunchta hai", async () => {
    const save = vi.fn<(value: { revision: number }) => Promise<void>>(
      async () => undefined,
    );
    const autosave = createAutosave({ save, debounceMs: 5 });
    autosave.schedule({ revision: 3 });
    await vi.advanceTimersByTimeAsync(5);
    expect(save).toHaveBeenCalledWith({ revision: 3 });
    autosave.dispose();
  });
});
