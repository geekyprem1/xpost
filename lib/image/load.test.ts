import { describe, expect, it } from "vitest";
import { firstImageFromList, validateImageFile } from "./load";

describe("validateImageFile", () => {
  it("valid PNG accept karta hai", () => {
    expect(validateImageFile({ type: "image/png", size: 1024 })).toBeNull();
  });

  it("galat type reject karta hai", () => {
    expect(validateImageFile({ type: "image/gif", size: 1024 })).not.toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1024 })).not.toBeNull();
  });

  it("10 MB se bada reject karta hai", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 11 * 1024 * 1024 })).not.toBeNull();
  });

  it("exactly 10 MB allowed hai", () => {
    expect(validateImageFile({ type: "image/webp", size: 10 * 1024 * 1024 })).toBeNull();
  });
});

describe("firstImageFromList", () => {
  it("pehli image file return karta hai", () => {
    const files = [
      { type: "text/plain", size: 1 },
      { type: "image/jpeg", size: 2 },
    ] as unknown as File[];
    expect(firstImageFromList(files)).toBe(files[1]);
  });

  it("null ya khaali list se null", () => {
    expect(firstImageFromList(null)).toBeNull();
    expect(firstImageFromList([])).toBeNull();
  });

  it("koi image na ho to null", () => {
    const files = [{ type: "text/plain", size: 1 }] as unknown as File[];
    expect(firstImageFromList(files)).toBeNull();
  });
});
