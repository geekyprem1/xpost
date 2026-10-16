import { describe, expect, it } from "vitest";
import { X_INTENT_URL, buildXIntentUrl, dataUrlToBlob } from "./x-share";

describe("x-share", () => {
  it("intent URL encoding", () => {
    const url = buildXIntentUrl("Hello world 🚀\nLine 2 #tag");
    expect(url.startsWith(`${X_INTENT_URL}?text=`)).toBe(true);
    expect(url).toBe(
      `${X_INTENT_URL}?text=${encodeURIComponent("Hello world 🚀\nLine 2 #tag")}`
    );
    expect(url).toContain("%0A");
    expect(url).toContain("%23tag");
  });

  it("empty text pe bhi valid URL", () => {
    expect(buildXIntentUrl("   ")).toBe(`${X_INTENT_URL}?text=`);
  });

  it("dataUrlToBlob mime + bytes", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,aGVsbG8=");
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBe(5);
  });
});
