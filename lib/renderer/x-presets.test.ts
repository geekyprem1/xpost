import { describe, expect, it, vi } from "vitest";
import {
  X_IMAGE_ATTEMPTS,
  X_IMAGE_MAX_BYTES,
  checkGifPreset,
  checkImagePreset,
  checkMp4Preset,
  encodeWithinLimit,
  xPresetSummary,
} from "./x-presets";

describe("x-presets: image", () => {
  it("5 MB boundary", () => {
    expect(checkImagePreset(X_IMAGE_MAX_BYTES).ok).toBe(true);
    const over = checkImagePreset(X_IMAGE_MAX_BYTES + 1);
    expect(over.ok).toBe(false);
    expect(over.issues[0]).toContain("5 MB");
  });

  it("attempts order: scale 2 pehle, quality step-down", () => {
    expect(X_IMAGE_ATTEMPTS[0]).toEqual({ scale: 2, quality: 0.9 });
    expect(X_IMAGE_ATTEMPTS.at(-1)).toEqual({ scale: 1, quality: 0.7 });
    for (let index = 1; index < X_IMAGE_ATTEMPTS.length; index++) {
      const previous = X_IMAGE_ATTEMPTS[index - 1];
      const current = X_IMAGE_ATTEMPTS[index];
      expect(
        current.quality < previous.quality || current.scale < previous.scale
      ).toBe(true);
    }
  });

  it("encodeWithinLimit: pehla attempt fit ho to ruk jata hai", async () => {
    const encode = vi.fn(async () => ({ bytes: 1_000_000, value: "ok" }));
    const result = await encodeWithinLimit(X_IMAGE_ATTEMPTS, X_IMAGE_MAX_BYTES, encode);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(result?.attempt.scale).toBe(2);
    expect(result?.value).toBe("ok");
  });

  it("encodeWithinLimit: bade size pe agla attempt try hota hai", async () => {
    const sizes = [9_000_000, 8_000_000, 4_000_000];
    let call = 0;
    const encode = vi.fn(async () => ({
      bytes: sizes[Math.min(call++, sizes.length - 1)],
      value: call,
    }));
    const result = await encodeWithinLimit(X_IMAGE_ATTEMPTS, X_IMAGE_MAX_BYTES, encode);
    expect(encode).toHaveBeenCalledTimes(3);
    expect(result?.attempt).toEqual({ scale: 1, quality: 0.9 });
  });

  it("encodeWithinLimit: sab attempts fail ho to null", async () => {
    const encode = vi.fn(async () => ({ bytes: 20_000_000, value: "big" }));
    const result = await encodeWithinLimit(X_IMAGE_ATTEMPTS, X_IMAGE_MAX_BYTES, encode);
    expect(encode).toHaveBeenCalledTimes(X_IMAGE_ATTEMPTS.length);
    expect(result).toBeNull();
  });
});

describe("x-presets: gif", () => {
  it("limits ke andar ok", () => {
    expect(
      checkGifPreset({ width: 1280, height: 800, frames: 91, bytes: 3_700_000 }).ok
    ).toBe(true);
  });

  it("resolution / frames / pixel budget / bytes violations", () => {
    expect(checkGifPreset({ width: 1400, height: 800, frames: 10, bytes: 1 }).issues).toContain(
      "Resolution exceeds 1280 x 1080"
    );
    expect(checkGifPreset({ width: 800, height: 600, frames: 400, bytes: 1 }).issues).toContain(
      "400 frames > 350"
    );
    const pixels = checkGifPreset({ width: 1280, height: 1080, frames: 350, bytes: 1 });
    expect(pixels.ok).toBe(false);
    expect(pixels.issues).toContain("width × height × frames > 300M");
    expect(
      checkGifPreset({ width: 800, height: 600, frames: 10, bytes: 16 * 1024 * 1024 }).issues
    ).toContain("Exceeds 15 MB (16.0 MB)");
  });
});

describe("x-presets: mp4", () => {
  it("valid preset ok", () => {
    expect(
      checkMp4Preset({ width: 1280, height: 800, fps: 30, durationSeconds: 6 }).ok
    ).toBe(true);
    expect(
      checkMp4Preset({ width: 1280, height: 960, fps: 30, durationSeconds: 5 }).ok
    ).toBe(true);
  });

  it("resolution / fps / duration violations", () => {
    expect(
      checkMp4Preset({ width: 1300, height: 800, fps: 30, durationSeconds: 6 }).issues
    ).toContain("Resolution exceeds 1280 x 1024");
    expect(
      checkMp4Preset({ width: 1280, height: 800, fps: 60, durationSeconds: 6 }).issues
    ).toContain("60 fps > 30");
    expect(
      checkMp4Preset({ width: 1280, height: 800, fps: 30, durationSeconds: 4 }).issues[0]
    ).toContain("5–10s ke bahar");
    expect(
      checkMp4Preset({ width: 1280, height: 800, fps: 30, durationSeconds: 12 }).issues[0]
    ).toContain("5–10s ke bahar");
  });

  it("extreme aspect ratio reject hota hai", () => {
    const check = checkMp4Preset({ width: 1280, height: 300, fps: 30, durationSeconds: 6 });
    expect(check.ok).toBe(false);
    expect(check.issues).toContain("aspect ratio 1:3–3:1 ke bahar");
  });
});

describe("xPresetSummary", () => {
  it("image/gif/mp4 ok cases", () => {
    expect(
      xPresetSummary("image", { width: 3000, height: 1875, bytes: 521_000 })
    ).toBe("X-ready ✓");
    expect(
      xPresetSummary("gif", {
        width: 1280,
        height: 800,
        bytes: 3_700_000,
        frames: 91,
        durationSeconds: 6,
      })
    ).toBe("X-ready ✓");
    expect(
      xPresetSummary("video", {
        width: 1280,
        height: 800,
        bytes: 195_000,
        frames: 180,
        durationSeconds: 6,
      })
    ).toBe("X-ready ✓");
  });

  it("violations summary mein pehla issue", () => {
    expect(
      xPresetSummary("gif", { width: 1280, height: 800, bytes: 1, frames: 400 })
    ).toBe("X: 400 frames > 350");
    expect(
      xPresetSummary("image", { width: 100, height: 100, bytes: 6 * 1024 * 1024 })
    ).toContain("X: Exceeds 5 MB");
    expect(
      xPresetSummary("video", {
        width: 1280,
        height: 800,
        bytes: 1,
        frames: 120,
        durationSeconds: 4,
      })
    ).toContain("X: duration");
  });
});
