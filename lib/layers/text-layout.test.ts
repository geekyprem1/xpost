import { describe, expect, it } from "vitest";
import type { TextLayer } from "@/lib/scene";
import { layoutText, wrapText } from "./text-layout";

const textLayer = (overrides: Partial<TextLayer> = {}): TextLayer => ({
  id: "text-1",
  kind: "text",
  visible: true,
  locked: false,
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  text: "hello world",
  style: {
    font: "inter",
    weight: 600,
    size: 50,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.2,
    letterSpacing: 0,
    background: null,
    shadow: null,
  },
  ...overrides,
});

const charMeasure = (perChar: number) => (text: string) =>
  Array.from(text).length * perChar;

describe("wrapText", () => {
  it("words ko max width pe wrap karta hai", () => {
    const measure = (text: string) => text.length * 10;
    expect(wrapText("hello world", 60, measure)).toEqual(["hello", "world"]);
    expect(wrapText("one two three", 100, measure)).toEqual([
      "one two",
      "three",
    ]);
  });

  it("explicit newlines aur blank lines preserve karta hai", () => {
    const measure = charMeasure(10);
    expect(wrapText("one\ntwo", 100, measure)).toEqual(["one", "two"]);
    expect(wrapText("one\n\ntwo", 100, measure)).toEqual(["one", "", "two"]);
  });

  it("lambi word ko characters pe todta hai", () => {
    const measure = charMeasure(10);
    expect(wrapText("abcdefghij", 40, measure)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("empty text ek empty line deta hai", () => {
    expect(wrapText("", 100, charMeasure(10))).toEqual([""]);
  });
});

describe("layoutText", () => {
  it("line height aur padding se height nikalta hai", () => {
    const layout = layoutText(textLayer(), {
      widthPx: 500,
      scale: 1,
      measure: charMeasure(10),
    });
    expect(layout.fontPx).toBe(50);
    expect(layout.lineHeightPx).toBe(60);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]).toEqual({ text: "hello world", width: 110 });
    expect(layout.heightPx).toBe(60);
  });

  it("wrap + multi-line height sahi hoti hai", () => {
    const layout = layoutText(textLayer({ text: "one two three" }), {
      widthPx: 80,
      scale: 1,
      measure: charMeasure(10),
    });
    expect(layout.lines.map((line) => line.text)).toEqual(["one two", "three"]);
    expect(layout.heightPx).toBe(120);
  });

  it("background padding wrap width aur height dono mein add hoti hai", () => {
    const layer = textLayer();
    layer.style.background = { color: "#fff", radius: 10, padding: 10 };
    const layout = layoutText(layer, {
      widthPx: 120,
      scale: 1,
      measure: charMeasure(10),
    });
    expect(layout.paddingPx).toBe(10);
    expect(layout.lines.map((line) => line.text)).toEqual(["hello", "world"]);
    expect(layout.heightPx).toBe(140);
  });

  it("scale font size aur height ko multiply karta hai", () => {
    const layout = layoutText(textLayer(), {
      widthPx: 1000,
      scale: 2,
      measure: charMeasure(20),
    });
    expect(layout.fontPx).toBe(100);
    expect(layout.lineHeightPx).toBe(120);
    expect(layout.heightPx).toBe(120);
  });
});
