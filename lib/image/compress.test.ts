import { describe, expect, it } from "vitest";
import { fitWithin } from "./compress";

describe("fitWithin", () => {
  it("bade image ko max tak shrink karta hai", () => {
    expect(fitWithin({ width: 3000, height: 1875 }, 1024)).toEqual({
      width: 1024,
      height: 640,
    });
    expect(fitWithin({ width: 1875, height: 3000 }, 1024)).toEqual({
      width: 640,
      height: 1024,
    });
  });

  it("chhote image ko upscale nahi karta", () => {
    expect(fitWithin({ width: 800, height: 600 }, 1024)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("edge: square + tiny", () => {
    expect(fitWithin({ width: 2048, height: 2048 }, 1024)).toEqual({
      width: 1024,
      height: 1024,
    });
    expect(fitWithin({ width: 1, height: 1 }, 1024)).toEqual({ width: 1, height: 1 });
  });
});
