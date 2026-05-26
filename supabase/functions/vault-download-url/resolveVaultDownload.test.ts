import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveVaultDownload } from "./helpers.ts";

Deno.test("resolveVaultDownload (new format) appends extension to slugged path", () => {
  const v = resolveVaultDownload("uuid-1/my-project-2026-05-26", "json");
  assertEquals(v.path, "uuid-1/my-project-2026-05-26.json");
  assertEquals(v.downloadName, "my-project-2026-05-26.json");
});

Deno.test("resolveVaultDownload (new format) handles xlsx", () => {
  const v = resolveVaultDownload("uuid-1/my-project-2026-05-26", "xlsx");
  assertEquals(v.path, "uuid-1/my-project-2026-05-26.xlsx");
  assertEquals(v.downloadName, "my-project-2026-05-26.xlsx");
});

Deno.test("resolveVaultDownload (legacy format) returns fixed filenames", () => {
  const j = resolveVaultDownload("uuid-1", "json");
  assertEquals(j.path, "uuid-1/restore_point.json");
  assertEquals(j.downloadName, "restore_point.json");

  const x = resolveVaultDownload("uuid-1", "xlsx");
  assertEquals(x.path, "uuid-1/project_summary.xlsx");
  assertEquals(x.downloadName, "project_summary.xlsx");
});
