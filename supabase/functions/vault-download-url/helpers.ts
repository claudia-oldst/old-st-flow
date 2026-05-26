/**
 * Pure helpers used by vault-download-url. Kept in a separate module so they
 * can be unit-tested without triggering the top-level `Deno.serve` in index.ts.
 */

/**
 * Resolve the storage path + suggested download filename for a vaulted artifact.
 *
 * New format (post-2026-05): vault_storage_path = "{project_id}/{slug}-{date}"
 *   → file lives at "{vault_storage_path}.{ext}", filename = "{slug}-{date}.{ext}"
 * Legacy format: vault_storage_path = "{project_id}"
 *   → file lives in fixed paths "restore_point.json" / "project_summary.xlsx".
 */
export function resolveVaultDownload(
  vaultStoragePath: string,
  kind: "json" | "xlsx",
): { path: string; downloadName: string } {
  const ext = kind === "json" ? "json" : "xlsx";
  const isNewFormat = vaultStoragePath.includes("/");
  if (isNewFormat) {
    return {
      path: `${vaultStoragePath}.${ext}`,
      downloadName: `${vaultStoragePath.split("/").pop()}.${ext}`,
    };
  }
  const legacy = ext === "json" ? "restore_point.json" : "project_summary.xlsx";
  return { path: `${vaultStoragePath}/${legacy}`, downloadName: legacy };
}
