import { describe, expect, it } from "vitest";
import {
  containsUnicodeFormatting,
  toUnicodeBold,
  toUnicodeItalic,
} from "./unicode-format";

describe("unicode-format", () => {
  it("bold letters + digits", () => {
    expect(toUnicodeBold("Bold")).toBe("𝗕𝗼𝗹𝗱");
    expect(toUnicodeBold("abc 123")).toBe("𝗮𝗯𝗰 𝟭𝟮𝟯");
    expect(toUnicodeBold("hello! ✓")).toBe("𝗵𝗲𝗹𝗹𝗼! ✓");
  });

  it("italic letters (sans-serif)", () => {
    expect(toUnicodeItalic("Ita")).toBe("𝘐𝘵𝘢");
    expect(toUnicodeItalic("hi")).toBe("𝘩𝘪");
  });

  it("containsUnicodeFormatting detect karta hai", () => {
    expect(containsUnicodeFormatting("plain text")).toBe(false);
    expect(containsUnicodeFormatting("some 𝗯𝗼𝗹𝗱 word")).toBe(true);
    expect(containsUnicodeFormatting("𝘐𝘵𝘢𝘭𝘪𝘤")).toBe(true);
  });
});
