import { describe, expect, it } from "vitest";
import { parseColor } from "./color";

describe("parseColor", () => {
  it("6-digit hex parse karta hai", () => {
    expect(parseColor("#ff0000")).toEqual([1, 0, 0]);
    expect(parseColor("#00ff80")).toEqual([0, 1, 128 / 255]);
  });

  it("3-digit hex parse karta hai", () => {
    expect(parseColor("#f0a")).toEqual([1, 0, 170 / 255]);
  });

  it("invalid value pe fallback deta hai", () => {
    expect(parseColor("rgb(1,2,3)")).toEqual([0, 0, 0]);
    expect(parseColor("", [0.5, 0.5, 0.5])).toEqual([0.5, 0.5, 0.5]);
  });
});
