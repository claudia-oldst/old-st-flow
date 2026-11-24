import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { closingDayEmail, formatClosingDate } from "./closingToday.ts";

Deno.test("subject uses project name", () => {
  assertEquals(closingDayEmail("Cousteau", "x", "Ann").subject, "Cousteau: Bug-fixing window closure");
});
Deno.test("body names project, date and ops person", () => {
  const { body } = closingDayEmail("Cousteau", "Tuesday 24 November 2026", "Ann");
  assertStringIncludes(body, "support window for Cousteau ends today, Tuesday 24 November 2026.");
  assertStringIncludes(body, "Best,\nAnn");
});
Deno.test("date format", () => {
  assertEquals(formatClosingDate("2026-11-24"), "Tuesday 24 November 2026");
});
