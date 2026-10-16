import { assertEquals } from "jsr:@std/assert@1";
import { generateSchema } from "../ai-generate/handle.ts";
import { refineSchema } from "../ai-refine/handle.ts";

Deno.test("generateSchema: valid + invalid", () => {
  const valid = generateSchema.safeParse({
    prompt: "about my app",
    image: "data:image/jpeg;base64," + "a".repeat(100),
  });
  assertEquals(valid.success, true);

  assertEquals(generateSchema.safeParse({ image: "short" }).success, false);
  assertEquals(
    generateSchema.safeParse({
      prompt: "x".repeat(501),
      image: "data:image/jpeg;base64," + "a".repeat(100),
    }).success,
    false
  );
});

Deno.test("refineSchema: action xor freeform", () => {
  const image = "a".repeat(64);
  const base = { currentText: "Hello post" };
  assertEquals(
    refineSchema.safeParse({ ...base, action: "better-hook" }).success,
    true
  );
  assertEquals(
    refineSchema.safeParse({ ...base, freeform: "make it funnier" }).success,
    true
  );
  assertEquals(
    refineSchema.safeParse({ ...base, action: "better-hook", freeform: "x" }).success,
    false
  );
  assertEquals(refineSchema.safeParse(base).success, false);
  assertEquals(
    refineSchema.safeParse({ ...base, action: "not-an-action" }).success,
    false
  );
  assertEquals(generateSchema.safeParse({ image }).success, true);
});

Deno.test("refineSchema: history cap 10", () => {
  const history = Array.from({ length: 11 }, () => ({
    role: "user" as const,
    content: "hi",
  }));
  assertEquals(
    refineSchema.safeParse({ currentText: "T", action: "shorter", history }).success,
    false
  );
  assertEquals(
    refineSchema.safeParse({
      currentText: "T",
      action: "shorter",
      history: history.slice(0, 10),
    }).success,
    true
  );
});
