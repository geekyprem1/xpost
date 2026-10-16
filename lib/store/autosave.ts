import type { Scene } from "@/lib/scene";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutosaveSaveFn = (scene: Scene) => Promise<void>;

export type AutosaveController = {
  schedule: (scene: Scene) => void;
  flush: () => Promise<void>;
  retry: () => void;
  getStatus: () => AutosaveStatus;
  subscribe: (listener: (status: AutosaveStatus) => void) => () => void;
  dispose: () => void;
};

export function createAutosave(options: {
  save: AutosaveSaveFn;
  debounceMs?: number;
  retryDelayMs?: number;
}): AutosaveController {
  const debounceMs = options.debounceMs ?? 2000;
  const retryDelayMs = options.retryDelayMs ?? 5000;

  let status: AutosaveStatus = "idle";
  let pending: Scene | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight = false;
  let disposed = false;
  const listeners = new Set<(status: AutosaveStatus) => void>();

  function setStatus(next: AutosaveStatus) {
    if (status === next) return;
    status = next;
    for (const listener of listeners) listener(next);
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(scene: Scene) {
    if (disposed) return;
    pending = scene;
    setStatus("dirty");
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, debounceMs);
  }

  function retry() {
    if (disposed) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    void flush();
  }

  async function flush(): Promise<void> {
    if (disposed) return;
    clearTimer();
    if (inflight) return;
    if (!pending) {
      if (status === "dirty") setStatus("saved");
      return;
    }

    inflight = true;
    const scene = pending;
    setStatus("saving");

    try {
      await options.save(scene);
      if (pending === scene) pending = null;
      setStatus(pending ? "dirty" : "saved");
      inflight = false;
      if (pending) await flush();
    } catch {
      inflight = false;
      setStatus("error");
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void flush();
      }, retryDelayMs);
    }
  }

  function getStatus() {
    return status;
  }

  function subscribe(listener: (status: AutosaveStatus) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function dispose() {
    disposed = true;
    clearTimer();
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    listeners.clear();
  }

  return { schedule, flush, retry, getStatus, subscribe, dispose };
}
