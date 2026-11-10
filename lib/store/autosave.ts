import type { Scene } from "@/lib/scene";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutosaveSaveFn<T = Scene> = (value: T) => Promise<void>;

export type AutosaveController<T = Scene> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  retry: () => void;
  getStatus: () => AutosaveStatus;
  subscribe: (listener: (status: AutosaveStatus) => void) => () => void;
  dispose: () => void;
};

export function createAutosave<T = Scene>(options: {
  save: AutosaveSaveFn<T>;
  debounceMs?: number;
  retryDelayMs?: number;
  /** false → status "error" rehta hai, auto-retry nahi (e.g. save conflict). */
  shouldRetry?: (error: unknown) => boolean;
  onError?: (error: unknown) => void;
}): AutosaveController<T> {
  const debounceMs = options.debounceMs ?? 2000;
  const retryDelayMs = options.retryDelayMs ?? 5000;

  let status: AutosaveStatus = "idle";
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> | null = null;
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

  function schedule(value: T) {
    if (disposed) return;
    pending = value;
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

  function flush(): Promise<void> {
    if (disposed) return Promise.resolve();
    clearTimer();
    // Cleanup callers must wait for the active save AND any newer snapshots
    // before disposing the controller.
    if (inflight) return inflight;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (pending === null) {
      if (status === "dirty") setStatus("saved");
      return Promise.resolve();
    }

    inflight = Promise.resolve()
      .then(async () => {
        while (!disposed && pending !== null) {
          const value = pending;
          setStatus("saving");
          try {
            await options.save(value);
            if (disposed) return;
            if (pending === value) pending = null;
            setStatus(pending !== null ? "dirty" : "saved");
          } catch (error) {
            if (disposed) return;
            setStatus("error");
            options.onError?.(error);
            if (retryTimer) clearTimeout(retryTimer);
            if (options.shouldRetry && !options.shouldRetry(error)) return;
            retryTimer = setTimeout(() => {
              retryTimer = null;
              void flush();
            }, retryDelayMs);
            return;
          }
        }
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
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
