import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildArchiveBasename } from "./helpers.ts";

Deno.test("buildArchiveBasename slugifies project name and appends YYYY-MM-DD", () => {
  assertEquals(
    buildArchiveBasename("My Cool Project!", "MCP", "2026-05-26T12:34:56.000Z"),
    "my-cool-project-2026-05-26",
  );
});

Deno.test("buildArchiveBasename collapses runs of non-alphanumerics", () => {
  assertEquals(
    buildArchiveBasename("  --A__B  ++C  ", null, "2026-01-02"),
    "a-b-c-2026-01-02",
  );
});

Deno.test("buildArchiveBasename falls back to acronym when name is missing", () => {
  assertEquals(
    buildArchiveBasename(null, "OLD", "2026-05-26"),
    "old-2026-05-26",
  );
});

Deno.test("buildArchiveBasename falls back to 'project' when everything is empty", () => {
  assertEquals(
    buildArchiveBasename("", "", "2026-05-26"),
    "project-2026-05-26",
  );
  assertEquals(
    buildArchiveBasename("///", null, "2026-05-26"),
    "project-2026-05-26",
  );
});

Deno.test("buildArchiveBasename truncates very long names to 60 chars", () => {
  const long = "a".repeat(120);
  const out = buildArchiveBasename(long, null, "2026-05-26");
  // 60 a's + "-2026-05-26"
  assertEquals(out, `${"a".repeat(60)}-2026-05-26`);
});

Deno.test("buildArchiveBasename only uses the date portion of an ISO timestamp", () => {
  assertEquals(
    buildArchiveBasename("Demo", null, "2026-05-26T23:59:59.999Z"),
    "demo-2026-05-26",
  );
});
