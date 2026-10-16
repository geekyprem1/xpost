import { beforeEach, describe, expect, it } from "vitest";
import { useCreditsStore } from "./credits-store";

beforeEach(() => {
  useCreditsStore.getState().clearCredits();
});

describe("credits store", () => {
  it("setCredits + clearCredits", () => {
    expect(useCreditsStore.getState().credits).toBeNull();
    useCreditsStore.getState().setCredits(12, "2026-11-01T00:00:00.000Z");
    expect(useCreditsStore.getState().credits).toBe(12);
    expect(useCreditsStore.getState().resetAt).toBe("2026-11-01T00:00:00.000Z");
    useCreditsStore.getState().clearCredits();
    expect(useCreditsStore.getState().credits).toBeNull();
    expect(useCreditsStore.getState().resetAt).toBeNull();
  });

  it("resetAt optional hai", () => {
    useCreditsStore.getState().setCredits(5);
    expect(useCreditsStore.getState().credits).toBe(5);
    expect(useCreditsStore.getState().resetAt).toBeNull();
  });
});
