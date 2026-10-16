import { describe, expect, it } from "vitest";
import {
  buildLoopTimestamps,
  capVideoSize,
  computeVideoDuration,
} from "./export-video";

describe("export-video helpers", () => {
  it("computeVideoDuration: <5s loop ke saath 5, >10s cap 10", () => {
    expect(computeVideoDuration(3)).toBe(5);
    expect(computeVideoDuration(7)).toBe(7);
    expect(computeVideoDuration(12)).toBe(10);
    expect(computeVideoDuration(0)).toBe(5);
    expect(computeVideoDuration(Number.NaN)).toBe(5);
  });

  it("buildLoopTimestamps: lambi source pe linear timestamps", () => {
    const timestamps = buildLoopTimestamps(6, 30, 8);
    expect(timestamps).toHaveLength(180);
    expect(timestamps[0]).toBe(0);
    expect(timestamps[1]).toBeCloseTo(1 / 30);
    expect(timestamps[179]).toBeCloseTo(179 / 30);
  });

  it("buildLoopTimestamps: chhoti source loop hoti hai", () => {
    const timestamps = buildLoopTimestamps(5, 30, 2.5);
    expect(timestamps).toHaveLength(150);
    expect(timestamps[75]).toBeCloseTo(0);
    expect(timestamps[74]).toBeCloseTo(74 / 30);
    expect(timestamps[149]).toBeCloseTo(149 / 30 - 2.5 * 1);
  });

  it("capVideoSize: X limits + even dimensions", () => {
    expect(capVideoSize({ width: 1500, height: 938 }, 1280, 1024)).toEqual({
      width: 1280,
      height: 800,
    });
    expect(capVideoSize({ width: 1000, height: 1000 }, 1280, 1024)).toEqual({
      width: 1000,
      height: 1000,
    });
    expect(capVideoSize({ width: 4000, height: 3000 }, 1280, 1024)).toEqual({
      width: 1280,
      height: 960,
    });
    const odd = capVideoSize({ width: 1501, height: 939 }, 1280, 1024);
    expect(odd.width % 2).toBe(0);
    expect(odd.height % 2).toBe(0);
    expect(capVideoSize({ width: 3, height: 3 }, 1280, 1024)).toEqual({
      width: 4,
      height: 4,
    });
  });
});
