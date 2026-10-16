import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  REFINE_INSTRUCTIONS,
  buildGenerateMessages,
  buildRefineMessages,
  cleanPostText,
} from "./prompts.ts";

Deno.test("cleanPostText: quotes, preamble, code fence hataata hai", () => {
  assertEquals(cleanPostText('"Hello world"'), "Hello world");
  assertEquals(cleanPostText("“Hello world”"), "Hello world");
  assertEquals(
    cleanPostText("Here's your post:\n\nHello world"),
    "Hello world"
  );
  assertEquals(cleanPostText("Sure!\n\nHello"), "Hello");
  assertEquals(cleanPostText("```\nHello\n```"), "Hello");
  assertEquals(cleanPostText("He said \"hi\" to me"), 'He said "hi" to me');
  assertEquals(cleanPostText("A\n\n\n\nB"), "A\n\nB");
});

Deno.test("buildGenerateMessages: prompt + image part", () => {
  const withPrompt = buildGenerateMessages({
    prompt: " about our new editor ",
    imageDataUrl: "data:image/jpeg;base64,abc",
  });
  assertEquals(withPrompt[0].role, "system");
  const parts = withPrompt[1].content as Array<{ type: string; text?: string }>;
  assertStringIncludes(parts[0].text ?? "", "about our new editor");
  assertEquals(parts[1].type, "image_url");

  const withoutPrompt = buildGenerateMessages({
    prompt: null,
    imageDataUrl: "data:image/jpeg;base64,abc",
  });
  const parts2 = withoutPrompt[1].content as Array<{ text?: string }>;
  assertStringIncludes(parts2[0].text ?? "", "Write an X post");
});

Deno.test("buildRefineMessages: chip instruction + freeform + history cap", () => {
  const chip = buildRefineMessages({
    action: "better-hook",
    currentText: "Old post",
    history: [],
  });
  const chipPrompt = chip[1].content as string;
  assertStringIncludes(chipPrompt, "Old post");
  assertStringIncludes(chipPrompt, REFINE_INSTRUCTIONS["better-hook"]);
  assertStringIncludes(chipPrompt, "ONLY the improved post text");

  const chat = buildRefineMessages({
    freeform: "add a question at the end",
    currentText: "Post text",
    history: [],
  });
  assertStringIncludes(chat[1].content as string, "add a question at the end");

  const many = Array.from({ length: 14 }, (_, index) => ({
    role: "user" as const,
    content: `msg-${index}`,
  }));
  const capped = buildRefineMessages({
    action: "shorter",
    currentText: "T",
    history: many,
  });
  assertEquals(capped.length, 1 + 10 + 1);
  assertStringIncludes(capped[1].content as string, "msg-4");
});
