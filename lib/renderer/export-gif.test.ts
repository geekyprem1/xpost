import { describe, expect, it } from "vitest";
import {
  GIF_FPS,
  GIF_MAX_FRAMES,
  GIF_MAX_HEIGHT,
  GIF_MAX_WIDTH,
  gifFrameDelayMs,
} from "./export-gif";
import { VIDEO_MAX_SECONDS } from "./export-video";

describe("export-gif helpers", () => {
  it("delay ms 15fps pe ~67ms, min 10ms clamp", () => {
    expect(gifFrameDelayMs(15)).toBe(67);
    expect(gifFrameDelayMs(30)).toBe(33);
    expect(gifFrameDelayMs(200)).toBe(10);
    expect(gifFrameDelayMs(0)).toBe(1000);
  });

  it("X limit invariants: frames aur pixel budget", () => {
    const maxFrames = VIDEO_MAX_SECONDS * GIF_FPS;
    expect(maxFrames).toBeLessThanOrEqual(GIF_MAX_FRAMES);
    expect(GIF_MAX_WIDTH * GIF_MAX_HEIGHT * maxFrames).toBeLessThanOrEqual(
      300_000_000
    );
  });
});
