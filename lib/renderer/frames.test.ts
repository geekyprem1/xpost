import { describe, expect, it } from "vitest";
import { FRAME_IDS } from "@/lib/scene";
import { FRAME_DESIGN_WIDTH, getFrameConfig, getFrameMetrics } from "./frames";

describe("frame configs", () => {
  it("screenshot ke alawa har frame id ka config hai", () => {
    for (const id of FRAME_IDS) {
      if (id === "screenshot") {
        expect(getFrameConfig(id)).toBeNull();
      } else {
        expect(getFrameConfig(id), id).not.toBeNull();
      }
    }
  });

  it("metrics positive insets dete hain", () => {
    for (const id of FRAME_IDS) {
      const config = getFrameConfig(id);
      if (!config) continue;
      const metrics = getFrameMetrics(config);
      expect(metrics.top, id).toBeGreaterThan(0);
      expect(metrics.bottom, id).toBeGreaterThan(0);
      expect(metrics.left, id).toBeGreaterThan(0);
      expect(metrics.right, id).toBeGreaterThan(0);
    }
  });

  it("design width 1000 hai", () => {
    expect(FRAME_DESIGN_WIDTH).toBe(1000);
  });

  it("original phone mockup screen opening stays aligned", () => {
    const iphone = getFrameConfig("iphone-18-pro");
    expect(iphone).not.toBeNull();
    const margin = iphone?.margin ?? 0;
    expect(iphone?.imageSrc).toBe("/frames/iphone-pro.png");
    expect(iphone?.screenAspect).toBeCloseTo(1206 / 2622);
    expect(margin).toBe(0);
    const metrics = getFrameMetrics(iphone!);
    expect(metrics.left).toBe(iphone!.bezel.left + margin);
    expect(metrics.top).toBe((iphone!.bezel.top ?? 0) + margin);
  });
});
