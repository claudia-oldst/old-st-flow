import { assertEquals } from "jsr:@std/assert@1";
import { intakeRouting } from "./schema.ts";

Deno.test("internal reports: Internal Feedback, no Slack", () => {
  assertEquals(intakeRouting(true), { version: "Internal Feedback", notifySlack: false });
});
Deno.test("external reports: External - Thalamus, Slack", () => {
  assertEquals(intakeRouting(false), { version: "External - Thalamus", notifySlack: true });
});
Deno.test("missing flag is external", () => {
  assertEquals(intakeRouting(undefined).version, "External - Thalamus");
});
