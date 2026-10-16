import { describe, expect, it } from "vitest";
import { X_WEIGHTED_LIMIT, analyzePostText } from "./post-text";

describe("analyzePostText (X weighted counting)", () => {
  it("plain ascii = char count, within limit", () => {
    const stats = analyzePostText("Hello world");
    expect(stats.weightedLength).toBe(11);
    expect(stats.overLimit).toBe(false);
    expect(stats.remaining).toBe(X_WEIGHTED_LIMIT - 11);
  });

  it("URL 23 chars count hota hai + badge", () => {
    const stats = analyzePostText("Check this https://example.com/very/long/path");
    expect(stats.weightedLength).toBe("Check this ".length + 23);
    expect(stats.hasUrl).toBe(true);
    expect(stats.urlCount).toBe(1);
  });

  it("emoji 2 chars count hote hain", () => {
    expect(analyzePostText("a 🚀").weightedLength).toBe(4);
  });

  it("CJK 2 chars count hote hain", () => {
    expect(analyzePostText("你好").weightedLength).toBe(4);
  });

  it("limit boundary", () => {
    const atLimit = analyzePostText("a".repeat(280));
    expect(atLimit.overLimit).toBe(false);
    expect(atLimit.remaining).toBe(0);
    const over = analyzePostText("a".repeat(281));
    expect(over.overLimit).toBe(true);
    expect(over.remaining).toBe(-1);
  });

  it("custom limit (long post toggle)", () => {
    const stats = analyzePostText("a".repeat(300), 25_000);
    expect(stats.overLimit).toBe(false);
    expect(stats.remaining).toBe(24_700);
  });
});
