import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_IDS } from "@/lib/scene";
import { FONTS, FONT_OPTIONS, ensureFont, fontStack } from "./index";

const publicFile = (file: string) =>
  path.join(process.cwd(), "public", file.replace(/^\//, ""));

describe("font registry", () => {
  it("har scene font id ka registry entry hai", () => {
    expect(Object.keys(FONTS).sort()).toEqual([...FONT_IDS].sort());
    expect(FONT_OPTIONS).toHaveLength(FONT_IDS.length);
  });

  it("self-hosted font files aur OFL licences maujood hain", () => {
    for (const font of Object.values(FONTS)) {
      expect(font.faces.length).toBeGreaterThan(0);
      for (const face of font.faces) {
        expect(existsSync(publicFile(face.file))).toBe(true);
      }
      expect(existsSync(publicFile(font.license))).toBe(true);
    }
  });

  it("fontStack family ko quote karta hai", () => {
    expect(fontStack("inter")).toBe('"Inter", sans-serif');
    expect(fontStack("playfair-display")).toContain('"Playfair Display"');
  });

  it("non-browser environment mein ensureFont no-op hai", async () => {
    await expect(ensureFont("inter")).resolves.toBeUndefined();
  });
});
