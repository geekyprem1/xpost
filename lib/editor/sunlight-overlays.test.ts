import { describe, expect, it } from "vitest";
import { OVERLAY_IDS } from "@/lib/scene";
import { SUNLIGHT_PAINTERS, createRandom } from "./sunlight-overlays";

describe("sunlight overlays", () => {
  it("har overlay id ka painter hai aur koi extra nahi", () => {
    expect(Object.keys(SUNLIGHT_PAINTERS).sort()).toEqual([...OVERLAY_IDS].sort());
    expect(OVERLAY_IDS).toHaveLength(19);
  });

  it("createRandom deterministic hai", () => {
    const first = createRandom(42);
    const second = createRandom(42);
    const sequenceA = [first(), first(), first()];
    const sequenceB = [second(), second(), second()];
    expect(sequenceA).toEqual(sequenceB);
    expect(sequenceA[0]).not.toBe(sequenceA[1]);
  });

  it("different seeds se different sequences", () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
});
