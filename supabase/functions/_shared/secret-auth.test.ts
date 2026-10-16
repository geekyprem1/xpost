import { assertEquals } from "jsr:@std/assert@1";
import { isAuthorizedCronRequest, timingSafeEqual } from "./secret-auth.ts";

Deno.test("timingSafeEqual: match / mismatch / length", () => {
  assertEquals(timingSafeEqual("abc123", "abc123"), true);
  assertEquals(timingSafeEqual("abc123", "abc124"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});

Deno.test("isAuthorizedCronRequest: header checks", () => {
  const expected = "super-secret-value";
  const good = new Request("http://x", { headers: { "x-cron-secret": expected } });
  const bad = new Request("http://x", { headers: { "x-cron-secret": "nope" } });
  const missing = new Request("http://x");
  assertEquals(isAuthorizedCronRequest(good, expected), true);
  assertEquals(isAuthorizedCronRequest(bad, expected), false);
  assertEquals(isAuthorizedCronRequest(missing, expected), false);
  assertEquals(isAuthorizedCronRequest(good, null), false);
  assertEquals(isAuthorizedCronRequest(good, ""), false);
});
