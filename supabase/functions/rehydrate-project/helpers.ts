/**
 * Pure helpers used by rehydrate-project. Kept in a separate module so they
 * can be unit-tested without triggering the top-level `Deno.serve` in index.ts.
 */

/**
 * Collect every user_id-shaped field referenced by an archive payload.
 * Used to detect missing team_members before rehydrating.
 */
// deno-lint-ignore no-explicit-any
export function collectUserIds(payload: any): string[] {
  const ids = new Set<string>();
  // deno-lint-ignore no-explicit-any
  const push = (v: any) => v && typeof v === "string" && ids.add(v);
  for (const r of payload?.project_members ?? []) push(r.user_id);
  for (const r of payload?.ticket_assignees ?? []) push(r.user_id);
  for (const r of payload?.ticket_comments ?? []) push(r.user_id);
  for (const r of payload?.ticket_estimate_changes ?? []) {
    push(r.user_id);
    push(r.decided_by);
  }
  for (const r of payload?.time_logs ?? []) push(r.user_id);
  for (const r of payload?.tickets ?? []) push(r.cr_decided_by);
  for (const r of payload?.epic_discounts ?? []) push(r.created_by);
  for (const r of payload?.sprint_capacities ?? []) push(r.user_id);
  for (const r of payload?.sprint_tickets ?? []) push(r.assigned_user_id);
  return [...ids];
}

/**
 * Resolve JSON + XLSX storage paths for an archived project, handling both
 * new ("{project_id}/{slug}-{date}") and legacy ("{project_id}") layouts.
 */
export function resolveVaultPaths(vaultStoragePath: string): {
  jsonPath: string;
  xlsxPath: string;
} {
  const isNewFormat = vaultStoragePath.includes("/");
  return isNewFormat
    ? {
        jsonPath: `${vaultStoragePath}.json`,
        xlsxPath: `${vaultStoragePath}.xlsx`,
      }
    : {
        jsonPath: `${vaultStoragePath}/restore_point.json`,
        xlsxPath: `${vaultStoragePath}/project_summary.xlsx`,
      };
}
