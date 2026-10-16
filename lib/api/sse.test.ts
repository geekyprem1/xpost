import { describe, expect, it } from "vitest";
import { createSseParser } from "./sse";

describe("createSseParser (client)", () => {
  it("split chunks + multiple events + comments", () => {
    const parser = createSseParser();
    expect(parser.push("data: {a")).toEqual([]);
    expect(parser.push("}\ndata: [DONE]\n")).toEqual(["{a}", "[DONE]"]);
    expect(parser.push(": ping\nevent: x\ndata: b\n")).toEqual(["b"]);
    expect(parser.push("data: c\r\n")).toEqual(["c"]);
  });
});
