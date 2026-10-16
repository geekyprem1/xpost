import { describe, expect, it } from "vitest";
import { exportFilename, exportMime } from "./export";

describe("export helpers", () => {
  it("filename mein timestamp + correct ext", () => {
    expect(exportFilename("png", new Date(2026, 9, 16, 18, 5, 9))).toBe(
      "shotlark-20261016-180509.png"
    );
  });

  it("jpg aur webp ext", () => {
    expect(exportFilename("jpg", new Date(2026, 0, 2, 3, 4, 5))).toBe(
      "shotlark-20260102-030405.jpg"
    );
    expect(exportFilename("webp", new Date(2026, 0, 2, 3, 4, 5))).toBe(
      "shotlark-20260102-030405.webp"
    );
  });

  it("mime mapping", () => {
    expect(exportMime("png")).toBe("image/png");
    expect(exportMime("jpg")).toBe("image/jpeg");
    expect(exportMime("webp")).toBe("image/webp");
  });

  it("mp4/gif filenames", () => {
    expect(exportFilename("mp4", new Date(2026, 9, 16, 18, 30, 0))).toBe(
      "shotlark-20261016-183000.mp4"
    );
    expect(exportFilename("gif", new Date(2026, 9, 16, 18, 30, 0))).toBe(
      "shotlark-20261016-183000.gif"
    );
  });
});
