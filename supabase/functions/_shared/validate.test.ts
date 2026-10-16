import { assertEquals } from "jsr:@std/assert@1";
import { z } from "npm:zod@4.6.7";
import { parseJsonBody } from "./validate.ts";

const schema = z.object({ prompt: z.string().min(2) });

Deno.test("parseJsonBody: valid body", async () => {
  const request = new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ prompt: "hello" }),
  });
  const result = await parseJsonBody(request, schema);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.data.prompt, "hello");
});

Deno.test("parseJsonBody: invalid JSON → 422", async () => {
  const request = new Request("http://x", { method: "POST", body: "not json" });
  const result = await parseJsonBody(request, schema);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 422);
    const body = await result.response.json();
    assertEquals(body.error.code, "VALIDATION_ERROR");
  }
});

Deno.test("parseJsonBody: schema mismatch → 422 + issues", async () => {
  const request = new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ prompt: "a" }),
  });
  const result = await parseJsonBody(request, schema);
  assertEquals(result.ok, false);
  if (!result.ok) {
    const body = await result.response.json();
    assertEquals(body.error.code, "VALIDATION_ERROR");
    assertEquals(Array.isArray(body.error.issues), true);
  }
});
