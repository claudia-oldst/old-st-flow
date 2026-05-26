import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { collectUserIds, resolveVaultPaths } from "./helpers.ts";

Deno.test("resolveVaultPaths (new format) appends .json and .xlsx", () => {
  const p = resolveVaultPaths("uuid-1/my-proj-2026-05-26");
  assertEquals(p.jsonPath, "uuid-1/my-proj-2026-05-26.json");
  assertEquals(p.xlsxPath, "uuid-1/my-proj-2026-05-26.xlsx");
});

Deno.test("resolveVaultPaths (legacy format) uses fixed filenames", () => {
  const p = resolveVaultPaths("uuid-1");
  assertEquals(p.jsonPath, "uuid-1/restore_point.json");
  assertEquals(p.xlsxPath, "uuid-1/project_summary.xlsx");
});

Deno.test("collectUserIds gathers ids from every payload section, dedup'd", () => {
  const payload = {
    project_members: [{ user_id: "u-1" }, { user_id: "u-2" }],
    ticket_assignees: [{ user_id: "u-1" }, { user_id: "u-3" }],
    ticket_comments: [{ user_id: "u-4" }],
    ticket_estimate_changes: [
      { user_id: "u-5", decided_by: "u-6" },
      { user_id: null, decided_by: "u-2" },
    ],
    time_logs: [{ user_id: "u-7" }],
    tickets: [{ cr_decided_by: "u-8" }, { cr_decided_by: null }],
  };
  const ids = collectUserIds(payload).sort();
  assertEquals(ids, ["u-1", "u-2", "u-3", "u-4", "u-5", "u-6", "u-7", "u-8"]);
});

Deno.test("collectUserIds ignores non-string and missing values", () => {
  const ids = collectUserIds({
    project_members: [{ user_id: 123 as unknown as string }, { user_id: "" }],
    ticket_assignees: [{}],
  });
  assertEquals(ids, []);
});

Deno.test("collectUserIds tolerates a fully empty payload", () => {
  assertEquals(collectUserIds({}), []);
  assertEquals(collectUserIds(null), []);
});
