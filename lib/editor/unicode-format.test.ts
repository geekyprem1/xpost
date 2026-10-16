import { describe, expect, it } from "vitest";
import {
  containsUnicodeFormatting,
  formatPostSelection,
} from "./unicode-format";

describe("formatPostSelection", () => {
  it("formats sans-serif letters and bold digits", () => {
    expect(formatPostSelection("Bold 123! ✓", 0, 0, "bold")).toEqual({
      text: "𝗕𝗼𝗹𝗱 𝟭𝟮𝟯! ✓",
      start: 0,
      end: "𝗕𝗼𝗹𝗱 𝟭𝟮𝟯! ✓".length,
    });
    expect(formatPostSelection("Ita 123", 0, 0, "italic").text).toBe("𝘐𝘵𝘢 123");
    expect(formatPostSelection("Ab 123", 0, 0, "boldItalic").text).toBe("𝘼𝙗 𝟭𝟮𝟯");
  });

  it("preserves untouched text and returns UTF-16 replacement offsets", () => {
    const source = "😀 say hi नमस्ते";
    const result = formatPostSelection(source, 7, 9, "bold");
    expect(result).toEqual({
      text: "😀 say 𝗵𝗶 नमस्ते",
      start: 7,
      end: 11,
    });
    expect(result.text.slice(result.start, result.end)).toBe("𝗵𝗶");
  });

  it("rounds partial surrogate selections outward without damaging emoji", () => {
    expect(formatPostSelection("a😀b", 2, 3, "bold")).toEqual({
      text: "a😀b",
      start: 1,
      end: 3,
    });
    expect(formatPostSelection("a😀b", 1, 2, "upper")).toEqual({
      text: "a😀b",
      start: 1,
      end: 3,
    });
    expect(formatPostSelection("a𝗯c", 2, 3, "clear")).toEqual({
      text: "abc",
      start: 1,
      end: 2,
    });
  });

  it("normalizes reversed and out-of-range selection bounds", () => {
    expect(formatPostSelection("abc", 3, 1, "upper")).toEqual({
      text: "aBC",
      start: 1,
      end: 3,
    });
    expect(formatPostSelection("abc", -5, 20, "bold")).toEqual({
      text: "𝗮𝗯𝗰",
      start: 0,
      end: 6,
    });
  });

  it("toggles styles off and composes bold and italic", () => {
    const bold = formatPostSelection("Ab 12", 0, 0, "bold");
    const combined = formatPostSelection(bold.text, bold.start, bold.end, "italic");
    expect(combined.text).toBe("𝘼𝙗 𝟭𝟮");
    expect(formatPostSelection(combined.text, 0, 0, "italic").text).toBe("𝗔𝗯 𝟭𝟮");
    expect(formatPostSelection(combined.text, 0, 0, "bold").text).toBe("𝘈𝘣 12");
    expect(formatPostSelection(combined.text, 0, 0, "boldItalic").text).toBe("Ab 12");
    expect(formatPostSelection(bold.text, 0, 0, "bold").text).toBe("Ab 12");
    expect(formatPostSelection("𝘈𝘣", 0, 0, "bold").text).toBe("𝘼𝙗");
  });

  it("applies a style uniformly to mixed plain and formatted selections", () => {
    expect(formatPostSelection("𝗔b", 0, 0, "bold").text).toBe("𝗔𝗯");
    expect(formatPostSelection("𝘈b", 0, 0, "italic").text).toBe("𝘈𝘣");
  });

  it("toggles underline and strike independently without removing accents", () => {
    const underline = formatPostSelection("café e\u0301", 0, 0, "underline");
    expect(underline.text).toBe("c\u0332a\u0332f\u0332é\u0332 e\u0301\u0332");
    expect(formatPostSelection(underline.text, 0, 0, "underline").text).toBe("café e\u0301");
    const both = formatPostSelection("a\u0332", 0, 0, "strike").text;
    expect(both).toBe("a\u0332\u0336");
    expect(formatPostSelection(both, 0, 0, "underline").text).toBe("a\u0336");
    expect(formatPostSelection(both, 0, 0, "strike").text).toBe("a\u0332");
  });

  it("decorates complete emoji and Hindi graphemes without splitting them", () => {
    const source = "👩🏽‍💻 हि";
    const decorated = formatPostSelection(source, 0, 0, "underline").text;
    expect(decorated).toBe("👩🏽‍💻\u0332 हि\u0332");
    expect(formatPostSelection(decorated, 0, 0, "underline").text).toBe(source);
    expect(formatPostSelection(decorated, 0, 0, "clear").text).toBe(source);
  });

  it("changes selected case while preserving styles and adjusting expansion offsets", () => {
    expect(formatPostSelection("x straße y", 2, 8, "upper")).toEqual({
      text: "x STRASSE y",
      start: 2,
      end: 9,
    });
    expect(formatPostSelection("𝗔𝘽𝘊 नमस्ते 😀", 0, 0, "lower").text).toBe(
      "𝗮𝙗𝘤 नमस्ते 😀",
    );
  });

  it("uses the entire post for collapsed character formatting", () => {
    expect(formatPostSelection("one two", 4, 4, "upper")).toEqual({
      text: "ONE TWO",
      start: 0,
      end: 7,
    });
    expect(formatPostSelection("", 0, 0, "bold")).toEqual({
      text: "",
      start: 0,
      end: 0,
    });
  });

  it("formats only the current complete line for a collapsed list selection", () => {
    expect(formatPostSelection("one\ntwo\nthree", 5, 5, "bullets")).toEqual({
      text: "one\n• two\nthree",
      start: 4,
      end: 9,
    });
    expect(formatPostSelection("one\ntwo", 4, 4, "numbered").text).toBe("one\n1. two");
  });

  it("expands list selections to complete lines but excludes the next line boundary", () => {
    expect(formatPostSelection("one\ntwo\nthree", 1, 8, "bullets")).toEqual({
      text: "• one\n• two\nthree",
      start: 0,
      end: 11,
    });
    expect(formatPostSelection("one\ntwo\nthree", 1, 9, "numbered").text).toBe(
      "1. one\n2. two\n3. three",
    );
  });

  it("preserves blank lines, indentation and CRLF while switching and toggling lists", () => {
    const source = "  alpha\r\n\r\n  beta\r\n";
    const bullets = formatPostSelection(source, 0, source.length, "bullets");
    expect(bullets.text).toBe("  • alpha\r\n\r\n  • beta\r\n");
    expect(bullets.text.slice(bullets.start, bullets.end)).toBe("  • alpha\r\n\r\n  • beta");
    expect(formatPostSelection(bullets.text, bullets.start, bullets.end, "bullets").text).toBe(source);
    const numbered = formatPostSelection(bullets.text, 0, bullets.text.length, "numbered");
    expect(numbered.text).toBe("  1. alpha\r\n\r\n  2. beta\r\n");
    expect(formatPostSelection(numbered.text, 0, numbered.text.length, "numbered").text).toBe(source);
  });

  it("clears supported styles and list prefixes without stripping scripts, links or accents", () => {
    const source = "• 𝗛𝙞\u0332\u0336 नमस्ते 👩🏽‍💻 café e\u0301\n2. https://example.com/a-b?q=1#x\n𝒜";
    const plain = "Hi नमस्ते 👩🏽‍💻 café e\u0301\nhttps://example.com/a-b?q=1#x\n𝒜";
    expect(formatPostSelection(source, 0, 0, "clear")).toEqual({
      text: plain,
      start: 0,
      end: plain.length,
    });
    expect(formatPostSelection("before 𝗛𝙞 after", 7, 11, "clear")).toEqual({
      text: "before Hi after",
      start: 7,
      end: 9,
    });
  });

  it("leaves supplementary emoji and Hindi unchanged during letter conversion", () => {
    const suffix = " 👩🏽‍💻 😀 नमस्ते";
    expect(formatPostSelection(`Hi${suffix}`, 0, 0, "bold").text).toBe(`𝗛𝗶${suffix}`);
    expect(formatPostSelection(`Hi${suffix}`, 0, 0, "italic").text).toBe(`𝘏𝘪${suffix}`);
    expect(formatPostSelection(`Hi${suffix}`, 0, 0, "boldItalic").text).toBe(`𝙃𝙞${suffix}`);
  });
});

describe("containsUnicodeFormatting", () => {
  it("detects mathematical styles and supported combining decorations", () => {
    expect(containsUnicodeFormatting("plain text 😀 नमस्ते")).toBe(false);
    expect(containsUnicodeFormatting("some 𝗯𝗼𝗹𝗱 word")).toBe(true);
    expect(containsUnicodeFormatting("𝘐𝘵𝘢𝘭𝘪𝘤")).toBe(true);
    expect(containsUnicodeFormatting("𝘼𝙗")).toBe(true);
    expect(containsUnicodeFormatting("a\u0332")).toBe(true);
    expect(containsUnicodeFormatting("a\u0336")).toBe(true);
    expect(containsUnicodeFormatting("e\u0301")).toBe(false);
  });
});
